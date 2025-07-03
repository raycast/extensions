import { Action, ActionPanel, List, open, showToast, Toast } from "@raycast/api";
import { useState, useEffect } from "react";
import RobloxDocsDataFetcher, { DocItem } from "./data-fetcher";

export default function Command() {
  const [searchText, setSearchText] = useState("");
  const [filteredDocs, setFilteredDocs] = useState<DocItem[]>([]);
  const [allDocs, setAllDocs] = useState<DocItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Performance optimization: limit displayed results
  const MAX_DISPLAYED_RESULTS = 50;

  // Initialize data fetcher
  const dataFetcher = new RobloxDocsDataFetcher();

  useEffect(() => {
    loadDocsData();
  }, []);

  useEffect(() => {
    if (searchText.trim() === "") {
      // When no search term, show only first items to avoid memory issues
      setFilteredDocs(allDocs.slice(0, MAX_DISPLAYED_RESULTS));
    } else {
      const searchLower = searchText.toLowerCase();

      // Filter and score results for relevance
      const scoredResults = allDocs
        .map((doc) => {
          let score = 0;
          const titleLower = doc.title.toLowerCase();
          const descLower = doc.description.toLowerCase();

          // Exact title match gets highest score
          if (titleLower === searchLower) score += 100;
          // Title starts with search term
          else if (titleLower.startsWith(searchLower)) score += 50;
          // Title contains search term
          else if (titleLower.includes(searchLower)) score += 25;

          // Description matches
          if (descLower.includes(searchLower)) score += 10;

          // Keyword matches
          if (doc.keywords.some((keyword) => keyword.toLowerCase().includes(searchLower))) score += 15;

          // Category/type matches
          if (doc.category.toLowerCase().includes(searchLower)) score += 5;
          if (doc.type.toLowerCase().includes(searchLower)) score += 5;

          return { doc, score };
        })
        .filter((item) => item.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, MAX_DISPLAYED_RESULTS)
        .map((item) => item.doc);

      setFilteredDocs(scoredResults);
    }
  }, [searchText, allDocs, MAX_DISPLAYED_RESULTS]);

  const loadDocsData = async () => {
    try {
      setIsLoading(true);
      showToast({
        style: Toast.Style.Animated,
        title: "Loading Roblox Creator Docs...",
        message: "Checking for updates...",
      });

      const docs = await dataFetcher.fetchDocsData();
      setAllDocs(docs);
      setFilteredDocs(docs.slice(0, MAX_DISPLAYED_RESULTS));

      showToast({
        style: Toast.Style.Success,
        title: "Docs Loaded Successfully",
        message: `Found ${docs.length} documentation pages`,
      });
    } catch (error) {
      console.error("Error loading docs data:", error);
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to Load Docs",
        message: "Using fallback data. Check your internet connection.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const clearCacheAndRefresh = async () => {
    try {
      showToast({
        style: Toast.Style.Animated,
        title: "Clearing Cache...",
        message: "Forcing fresh data fetch",
      });

      // Clear the cache
      dataFetcher.clearCache();

      // Reload data
      await loadDocsData();
    } catch (error) {
      console.error("Error clearing cache:", error);
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to Clear Cache",
        message: "Please try again",
      });
    }
  };

  const getIconForType = (type: DocItem["type"], title?: string) => {
    // Apply smart icon detection for classes, references, and guides
    // since Roblox class docs can be categorized under any of these types
    if (title && (type === "class" || type === "reference" || type === "guide")) {
      const classIcon = getClassIcon(title);
      // Only use class icon if it's not the default, otherwise fall back to type icon
      if (classIcon !== "⚙️") {
        return classIcon;
      }
    }

    switch (type) {
      case "class":
        return "⚙️";
      case "service":
        return "🔧";
      case "tutorial":
        return "📚";
      case "reference":
        return "📖";
      case "guide":
        return "📝";
      case "enum":
        return "🔢";
      case "global":
        return "🌐";
      case "property":
        return "🔶";
      case "method":
        return "🔵";
      case "event":
        return "⚡";
      case "callback":
        return "🔄";
      case "function":
        return "🟢";
      default:
        return "📄";
    }
  };

  const getClassIcon = (className: string) => {
    const name = className.toLowerCase();

    // Audio/Sound classes
    if (name.includes("audio") || name.includes("sound") || name.includes("music")) {
      return "🔊";
    }

    // UI/GUI classes
    if (
      name.includes("gui") ||
      name.includes("frame") ||
      name.includes("button") ||
      name.includes("label") ||
      name.includes("textbox") ||
      name.includes("screen")
    ) {
      return "🖥️";
    }

    // Parts and physical objects
    if (
      name.includes("part") ||
      name.includes("mesh") ||
      name.includes("union") ||
      name.includes("wedge") ||
      name.includes("cylinder") ||
      name.includes("sphere")
    ) {
      return "🧊";
    }

    // Lighting and visual effects
    if (
      name.includes("light") ||
      name.includes("effect") ||
      name.includes("beam") ||
      name.includes("fire") ||
      name.includes("smoke") ||
      name.includes("sparkles")
    ) {
      return "💡";
    }

    // Animation classes
    if (
      name.includes("animation") ||
      name.includes("keyframe") ||
      name.includes("pose") ||
      name.includes("motor") ||
      name.includes("joint")
    ) {
      return "🎭";
    }

    // Camera and rendering
    if (name.includes("camera") || name.includes("viewport")) {
      return "📷";
    }

    // Player and character related
    if (
      name.includes("player") ||
      name.includes("humanoid") ||
      name.includes("character") ||
      name.includes("backpack") ||
      name.includes("starter")
    ) {
      return "👤";
    }

    // Workspace and game structure
    if (
      name.includes("workspace") ||
      name.includes("folder") ||
      name.includes("model") ||
      name.includes("configuration")
    ) {
      return "📁";
    }

    // Physics and forces
    if (
      name.includes("body") ||
      name.includes("force") ||
      name.includes("velocity") ||
      name.includes("position") ||
      name.includes("attachment")
    ) {
      return "⚡";
    }

    // Input and controls
    if (
      name.includes("input") ||
      name.includes("mouse") ||
      name.includes("keyboard") ||
      name.includes("touch") ||
      name.includes("gamepad")
    ) {
      return "🎮";
    }

    // Network and communication
    if (
      name.includes("remote") ||
      name.includes("event") ||
      name.includes("function") ||
      name.includes("bindable") ||
      name.includes("http")
    ) {
      return "📡";
    }

    // Script and programming
    if (name.includes("script") || name.includes("module") || name.includes("local")) {
      return "📜";
    }

    // Default class icon
    return "⚙️";
  };

  return (
    <List
      searchText={searchText}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search Roblox Creator Docs..."
      isLoading={isLoading}
      throttle
    >
      <List.Section
        title="Results"
        subtitle={
          filteredDocs.length >= MAX_DISPLAYED_RESULTS
            ? `${filteredDocs.length}+ docs (showing top ${MAX_DISPLAYED_RESULTS})`
            : `${filteredDocs.length} docs from ${allDocs.length} total`
        }
      >
        {filteredDocs.map((doc) => (
          <List.Item
            key={doc.id}
            icon={getIconForType(doc.type, doc.title)}
            title={doc.title}
            subtitle={doc.category}
            accessories={[
              { text: doc.type },
              { text: doc.description.length > 50 ? doc.description.substring(0, 47) + "..." : doc.description },
            ]}
            actions={
              <ActionPanel>
                <Action title="Open in Browser" onAction={() => open(doc.url)} icon="🌐" />
                <Action.CopyToClipboard
                  title="Copy URL"
                  content={doc.url}
                  shortcut={{ modifiers: ["cmd"], key: "c" }}
                  icon="📋"
                />
                <Action.CopyToClipboard
                  title="Copy Title"
                  content={doc.title}
                  shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
                  icon="📝"
                />
                <Action
                  title="Refresh Data"
                  onAction={loadDocsData}
                  shortcut={{ modifiers: ["cmd"], key: "r" }}
                  icon="🔄"
                />
                <Action
                  title="Clear Cache & Refresh"
                  onAction={clearCacheAndRefresh}
                  shortcut={{ modifiers: ["cmd", "shift"], key: "r" }}
                  icon="🗑️"
                />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>

      {filteredDocs.length === 0 && !isLoading && (
        <List.EmptyView
          icon="../assets/no-results.png"
          title="No Results Found"
          description={`No documentation found for "${searchText}". Try a different search term.`}
        />
      )}
    </List>
  );
}
