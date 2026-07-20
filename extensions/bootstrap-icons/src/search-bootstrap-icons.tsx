import { useState, useMemo, useEffect, useRef } from "react";
import { ActionPanel, Action, Grid, getPreferenceValues, Icon, AI, environment, showToast, Toast } from "@raycast/api";
import iconsData from "./icons-data.json";

interface BootstrapIcon {
  name: string;
  svgContent: string;
}

// Constants for AI search configuration
const AI_SEARCH_DEBOUNCE_MS = 500;
const AI_CACHE_MAX_SIZE = 50;
const AI_SAMPLE_SIZE = 300;
const AI_MAX_RESULTS = 24;

function getSvgDataUri(svgContent: string): string {
  const encodedSvg = encodeURIComponent(svgContent);
  return `data:image/svg+xml,${encodedSvg}`;
}

export default function Command() {
  const [searchText, setSearchText] = useState("");
  const [aiSuggestedIcons, setAiSuggestedIcons] = useState<BootstrapIcon[]>([]);
  const [isAiSearching, setIsAiSearching] = useState(false);
  const { preferredCopyMethod } = getPreferenceValues<{ preferredCopyMethod: string }>();

  // Cache for AI search results to prevent redundant API calls
  const aiCacheRef = useRef<Map<string, string[]>>(new Map());
  // Track ongoing AI requests to prevent duplicates
  const ongoingRequestRef = useRef<string | null>(null);

  const icons = iconsData as BootstrapIcon[];

  const filteredIcons = useMemo(() => {
    if (!searchText) return icons;
    const query = searchText.toLowerCase();
    return icons.filter((icon) => icon.name.toLowerCase().includes(query));
  }, [icons, searchText]);

  // AI-powered search when no results are found
  useEffect(() => {
    let cancelled = false;

    async function performAiSearch() {
      // Only perform AI search if:
      // 1. User has AI access
      // 2. There's a search query
      // 3. No results from regular search
      if (!environment.canAccess(AI) || !searchText || filteredIcons.length > 0) {
        setAiSuggestedIcons([]);
        ongoingRequestRef.current = null;
        return;
      }

      const normalizedQuery = searchText.toLowerCase().trim();

      // Check cache first
      const cachedResults = aiCacheRef.current.get(normalizedQuery);
      if (cachedResults) {
        const suggested = icons.filter((icon) => cachedResults.includes(icon.name));
        setAiSuggestedIcons(suggested);
        return;
      }

      // Prevent duplicate requests for the same query
      if (ongoingRequestRef.current === normalizedQuery) {
        return;
      }

      ongoingRequestRef.current = normalizedQuery;
      setIsAiSearching(true);

      try {
        // Optimize: Only send a sample of icon names to reduce memory usage
        const sampledIcons = icons
          .filter((_, index) => index % Math.ceil(icons.length / AI_SAMPLE_SIZE) === 0)
          .slice(0, AI_SAMPLE_SIZE);
        const iconNamesSample = sampledIcons.map((icon) => icon.name).join(", ");

        const prompt = `You are helping find Bootstrap icons that match a user's search intent.

          User's search query: "${searchText}"

          Here is a sample of available icon names: ${iconNamesSample}

          Analyze the user's query and return a JSON array of icon names that best match their intent. Consider:
            - Semantic similarity (e.g., "profile" -> "person", "person-circle")
            - Common use cases (e.g., "home" -> "house", "house-door")
            - Related concepts
            - Variations (fill, outline, etc.)

          Return ONLY a JSON array of up to ${AI_MAX_RESULTS} matching icon names, nothing else. Example: ["person", "person-circle", "person-fill"]
        `;

        const response = await AI.ask(prompt, {
          model: AI.Model["OpenAI_GPT4o-mini"],
        });

        if (cancelled) return;

        // Parse AI response to get icon names
        const cleanedResponse = response.trim().replace(/```json\n?|```\n?/g, "");
        const suggestedNames = JSON.parse(cleanedResponse) as string[];

        // Validate that we received an array
        if (!Array.isArray(suggestedNames)) {
          throw new Error("AI response is not an array");
        }

        // Cache the results
        aiCacheRef.current.set(normalizedQuery, suggestedNames);

        // Limit cache size to prevent memory issues
        if (aiCacheRef.current.size > AI_CACHE_MAX_SIZE) {
          const firstKey = aiCacheRef.current.keys().next().value;
          if (firstKey) {
            aiCacheRef.current.delete(firstKey);
          }
        }

        // Filter icons based on AI suggestions (use Set for O(1) lookup)
        const suggestedNamesSet = new Set(suggestedNames);
        const suggested = icons.filter((icon) => suggestedNamesSet.has(icon.name));
        setAiSuggestedIcons(suggested);
      } catch (error) {
        console.error("AI search failed:", error);
        setAiSuggestedIcons([]);
        // Show user-friendly error toast
        showToast({
          style: Toast.Style.Failure,
          title: "AI Search Failed",
          message: "Could not find AI-suggested icons. Try refining your search.",
        });
      } finally {
        if (!cancelled) {
          setIsAiSearching(false);
          ongoingRequestRef.current = null;
        }
      }
    }

    // Debounce AI search to prevent rapid successive calls
    const debounceTimeout = setTimeout(() => {
      performAiSearch();
    }, AI_SEARCH_DEBOUNCE_MS);

    return () => {
      cancelled = true;
      if (debounceTimeout) {
        clearTimeout(debounceTimeout);
      }
    };
  }, [searchText, filteredIcons.length]);

  // Determine which icons to display
  const displayIcons = filteredIcons.length > 0 ? filteredIcons : aiSuggestedIcons;
  const hasAiAccess = environment.canAccess(AI);
  const showAiSearchingView = isAiSearching && hasAiAccess && filteredIcons.length === 0;
  const showEmptyView = filteredIcons.length === 0 && aiSuggestedIcons.length === 0 && !isAiSearching;

  return (
    <Grid
      columns={6}
      inset={Grid.Inset.Large}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search Bootstrap Icons..."
      throttle
      isLoading={isAiSearching}
    >
      {displayIcons.map((icon) => {
        const svgDataUri = getSvgDataUri(icon.svgContent);
        const spriteExample = `<svg class="bi" width="32" height="32" fill="currentColor">
          <use xlink:href="bootstrap-icons.svg#${icon.name}"/>
        </svg>`;
        const externalImageExample = `<img src="/assets/icons/${icon.name}.svg" alt="${icon.name}" width="32" height="32">`;
        const iconFontExample = `<i class="bi bi-${icon.name}"></i>`;

        // Define all actions with their identifiers
        const allActions = {
          iconName: (
            <Action.CopyToClipboard
              key="iconName"
              title="Copy as Icon Name"
              icon={Icon.Pencil}
              content={icon.name}
              shortcut={{ modifiers: ["cmd"], key: "c" }}
            />
          ),
          embeddedSvg: (
            <Action.CopyToClipboard
              key="embeddedSvg"
              title="Copy as Embedded SVG"
              icon={Icon.CodeBlock}
              content={icon.svgContent}
              shortcut={{ modifiers: ["cmd", "shift"], key: "e" }}
            />
          ),
          sprite: (
            <Action.CopyToClipboard
              key="sprite"
              title="Copy as Sprite"
              icon={Icon.Tree}
              content={spriteExample}
              shortcut={{ modifiers: ["cmd", "shift"], key: "s" }}
            />
          ),
          externalImage: (
            <Action.CopyToClipboard
              key="externalImage"
              title="Copy as External Image"
              icon={Icon.Image}
              content={externalImageExample}
              shortcut={{ modifiers: ["cmd", "shift"], key: "i" }}
            />
          ),
          iconFont: (
            <Action.CopyToClipboard
              key="iconFont"
              title="Copy as Icon Font"
              icon={Icon.Text}
              content={iconFontExample}
              shortcut={{ modifiers: ["cmd", "shift"], key: "f" }}
            />
          ),
        };

        // Reorder actions to put preferred method first
        const orderedActions = [
          allActions[preferredCopyMethod as keyof typeof allActions],
          ...Object.entries(allActions)
            .filter(([key]) => key !== preferredCopyMethod)
            .map(([, action]) => action),
        ];

        return (
          <Grid.Item
            key={icon.name}
            content={{ value: { source: svgDataUri }, tooltip: icon.name }}
            title={icon.name}
            actions={<ActionPanel>{orderedActions}</ActionPanel>}
          />
        );
      })}
      {showAiSearchingView && (
        <Grid.EmptyView
          icon={{ source: Icon.Stars }}
          title="AI Searching for Similar Icons..."
          description={`Looking for icons related to "${searchText}"`}
        />
      )}
      {showEmptyView && (
        <Grid.EmptyView
          icon={{ source: "https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.0/icons/search.svg" }}
          title="No Icons Found"
          description={`No Bootstrap Icons match "${searchText}"\nTry refining your search query`}
        />
      )}
    </Grid>
  );
}
