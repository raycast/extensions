import { Action, ActionPanel, List, open, showToast, Toast, getPreferenceValues } from "@raycast/api";
import { useState, useEffect, useMemo } from "react";
import RobloxDocsDataFetcher, { DocItem } from "./data-fetcher";

interface Preferences {
  hideIcons: boolean;
}

// Performance optimization: limit displayed results
const MAX_DISPLAYED_RESULTS = 50;

// Icon mapping for categories and types
const ICON_MAP: Record<string, string> = {
  // Type-specific icons (take priority)
  method: "../assets/icons/method.svg",
  event: "../assets/icons/event.svg",
  property: "../assets/icons/property.svg",
  function: "../assets/icons/function.svg",
  callback: "../assets/icons/callback.svg",
  enum: "../assets/icons/enum.svg",
  global: "../assets/icons/global.svg",
  // Category-based icons
  Classes: "../assets/icons/class.svg",
  Enums: "../assets/icons/enum.svg",
  Globals: "../assets/icons/global.svg",
  Tutorials: "../assets/icons/tutorial.svg",
  Scripting: "../assets/icons/script.svg",
  UI: "../assets/icons/ui.svg",
  Sound: "../assets/icons/audio.svg",
  Physics: "../assets/icons/physics.svg",
};

const ACTION_ICONS = {
  browser: "../assets/icons/browser.svg",
  clipboard: "../assets/icons/clipboard.svg",
  text: "../assets/icons/text.svg",
  refresh: "../assets/icons/refresh.svg",
  trash: "../assets/icons/trash.svg",
} as const;

// Reference type mapping configuration
const REFERENCE_TYPES: Record<string, string> = {
  Class: "classes",
  Datatype: "datatypes",
  Enum: "enums",
  Global: "globals",
};

// Helper: Process Roblox API references in text
function processClassReferences(text: string): string {
  if (!text) return "";

  try {
    const typePattern = Object.keys(REFERENCE_TYPES).join("|");
    const getUrlPath = (refType: string) => REFERENCE_TYPES[refType] || "classes";

    // Process references in order of specificity
    return text
      .replace(new RegExp(`\`(${typePattern})\\.(\\w+)\\|([^\`]+)\``, "g"), (_m, refType, name, displayText) => {
        return `[\`${displayText}\`](https://create.roblox.com/docs/reference/engine/${getUrlPath(refType)}/${name})`;
      })
      .replace(
        new RegExp(`(?<!\`|\\[)(${typePattern})\\.(\\w+)\\|([^\\s\`]+)(?!\`)`, "g"),
        (_m, refType, name, displayText) => {
          return `[\`${displayText}\`](https://create.roblox.com/docs/reference/engine/${getUrlPath(refType)}/${name})`;
        },
      )
      .replace(
        new RegExp(`\`(${typePattern})\\.(\\w+):(\\w+)\\([^)]*\\)\\|([^\`]+)\``, "g"),
        (_m, refType, name, method, displayText) => {
          return `[${displayText}](https://create.roblox.com/docs/reference/engine/${getUrlPath(refType)}/${name}#${method})`;
        },
      )
      .replace(
        new RegExp(`(?<!\`|\\[\`)(${typePattern})\\.(\\w+):(\\w+)\\([^)]*\\)\\|(\\S+)(?!\`)`, "g"),
        (_m, refType, name, method, displayText) => {
          return `[${displayText}](https://create.roblox.com/docs/reference/engine/${getUrlPath(refType)}/${name}#${method})`;
        },
      )
      .replace(new RegExp(`\`(${typePattern})\\.(\\w+):(\\w+)\\([^)]*\\)\``, "g"), (_m, refType, name, method) => {
        return `[${method}()](https://create.roblox.com/docs/reference/engine/${getUrlPath(refType)}/${name}#${method})`;
      })
      .replace(
        new RegExp(`(?<!\`|\\[\`)(${typePattern})\\.(\\w+):(\\w+)\\([^)]*\\)(?!\`|\\|)`, "g"),
        (_m, refType, name, method) => {
          return `[${method}()](https://create.roblox.com/docs/reference/engine/${getUrlPath(refType)}/${name}#${method})`;
        },
      )
      .replace(
        new RegExp(`\`(${typePattern})\\.(\\w+)\\.(\\w+)\\|([^\`]+)\``, "g"),
        (_m, refType, name, anchor, displayText) => {
          return `[${displayText}](https://create.roblox.com/docs/reference/engine/${getUrlPath(refType)}/${name}#${anchor})`;
        },
      )
      .replace(
        new RegExp(`(?<!\`|\\[\`)(${typePattern})\\.(\\w+)\\.(\\w+)\\|([^\\s\`]+)(?!\`)`, "g"),
        (_m, refType, name, anchor, displayText) => {
          return `[${displayText}](https://create.roblox.com/docs/reference/engine/${getUrlPath(refType)}/${name}#${anchor})`;
        },
      )
      .replace(new RegExp(`\`(${typePattern})\\.(\\w+)\\.(\\w+)\``, "g"), (_m, refType, name, property) => {
        return `[${property}](https://create.roblox.com/docs/reference/engine/${getUrlPath(refType)}/${name}#${property})`;
      })
      .replace(
        new RegExp(`(?<!\`|\\[\`)(${typePattern})\\.(\\w+)\\.(\\w+)(?!\`|\\|)`, "g"),
        (_m, refType, name, property) => {
          return `[${property}](https://create.roblox.com/docs/reference/engine/${getUrlPath(refType)}/${name}#${property})`;
        },
      )
      .replace(new RegExp(`\`(${typePattern})\\.(\\w+)\``, "g"), (_m, refType, name) => {
        return `[${name}](https://create.roblox.com/docs/reference/engine/${getUrlPath(refType)}/${name})`;
      })
      .replace(new RegExp(`(?<!\`|\\[\`)(${typePattern})\\.(\\w+)(?!\`|\\.|:)`, "g"), (_m, refType, name) => {
        return `[${name}](https://create.roblox.com/docs/reference/engine/${getUrlPath(refType)}/${name})`;
      });
  } catch (error) {
    console.error("Error processing class references:", error);
    return text; // Return original text if processing fails
  }
}

// Helper: Process code blocks for Lua syntax highlighting
function processCodeBlocks(text: string): string {
  if (!text) return "";
  return text.replace(/```(lua|luau)\n([\s\S]*?)```/g, (_m, _lang, code) => `\`\`\`lua\n${code}\`\`\``);
}

// Helper: Build type lookup from docs (enums, datatypes, classes)
function buildTypeLookup(docs: DocItem[]): Map<string, string> {
  const lookup = new Map<string, string>();
  for (const doc of docs) {
    if (doc.category === "Enums" && doc.type === "enum") {
      lookup.set(doc.title, "enums");
    } else if (doc.category === "Classes" && (doc.type === "class" || doc.type === "service")) {
      lookup.set(doc.title, "classes");
    } else if (doc.category === "Datatypes" && doc.type === "datatype") {
      lookup.set(doc.title, "datatypes");
    } else if (doc.category === "Globals" && doc.type === "global") {
      // Globals like task, os, etc. - link to globals
      lookup.set(doc.title, "globals");
    }
  }
  return lookup;
}

// Helper: Render markdown for detail view
function renderDetailMarkdown(doc: DocItem, typeLookup: Map<string, string>): string {
  if (!doc?.title || !doc?.url) return "**Error:** Invalid documentation item";

  const parts: string[] = [];

  // Header
  parts.push(`## \`${doc.title}\`\n\n\`${doc.type}\` · ${doc.category}\n\n`);

  // Signature (for methods/functions) - make types clickable only if they exist
  if (doc.signature) {
    const linkedSignature = doc.signature.replace(/: ([A-Z]\w+)/g, (_m, type) => {
      const typeCategory = typeLookup.get(type);
      if (typeCategory) {
        return `: [${type}](https://create.roblox.com/docs/reference/engine/${typeCategory}/${type})`;
      }
      return `: ${type}`; // No link if type not found in docs
    });
    parts.push(`### Signature\n\n${linkedSignature}\n\n`);
  }

  // Description
  if (doc.description) {
    parts.push(`### Description\n\n${processCodeBlocks(processClassReferences(doc.description))}\n\n`);
  } else if (!doc.signature) {
    parts.push(`### Description\n\n*No preview available. View the full page for details.*\n\n`);
  }

  // Footer - always add this
  parts.push(`---\n\n**[📖 View Full Documentation →](${doc.url})**`);

  return parts.join("");
}

export default function Command() {
  const preferences = getPreferenceValues<Preferences>();
  const [searchText, setSearchText] = useState("");
  const [allDocs, setAllDocs] = useState<DocItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showingDetail, setShowingDetail] = useState(true);

  // Initialize data fetcher once - critical for performance
  const dataFetcher = useMemo(() => new RobloxDocsDataFetcher(), []);

  useEffect(() => {
    loadDocsData();
  }, []); // loadDocsData is stable

  // Build type lookup for linking types in signatures
  const typeLookup = useMemo(() => buildTypeLookup(allDocs), [allDocs]);

  const isSearchEmpty = searchText.trim() === "";

  // Optimized search with useMemo and early exit
  // Re-runs whenever searchText OR allDocs changes (including when data loads)
  const filteredDocs = useMemo(() => {
    // Show empty if still loading or no data loaded yet
    if (allDocs.length === 0) {
      return [];
    }

    if (searchText.trim() === "") {
      return [];
    }

    const searchLower = searchText.toLowerCase();
    const results: { doc: DocItem; score: number }[] = [];

    for (const doc of allDocs) {
      const titleLower = doc.title.toLowerCase();

      // Fast path: check title first (most common match)
      const titleMatch = titleLower.includes(searchLower);

      if (!titleMatch) {
        // Only check other fields if title doesn't match
        const descriptionMatch = doc.description.toLowerCase().includes(searchLower);
        const categoryMatch = doc.category.toLowerCase().includes(searchLower);
        const typeMatch = doc.type.toLowerCase().includes(searchLower);

        // Skip if no match at all
        if (!descriptionMatch && !categoryMatch && !typeMatch) {
          continue;
        }

        // Non-title matches get lower scores
        const matchScore = descriptionMatch ? 100 : 50;
        const categoryMultiplier = doc.category === "Classes" ? 8 : 1;

        results.push({ doc, score: matchScore * categoryMultiplier });
        continue;
      }

      // Calculate title match score
      let matchScore: number;

      // Check for exact match (including colon-separated like "Animator:LoadAnimation")
      const titlePart =
        titleLower.includes(":") || titleLower.includes(".") ? titleLower.split(/[:.]/)[1] || titleLower : titleLower;

      if (titleLower === searchLower || titlePart === searchLower) {
        matchScore = 1000; // Exact match
      } else if (titleLower.startsWith(searchLower)) {
        matchScore = 500; // Starts with
      } else {
        matchScore = 250; // Contains
      }

      // Apply category priority multipliers
      const isClassEntry = doc.category === "Classes";
      const isMainClass = isClassEntry && (doc.type === "class" || doc.type === "service");

      const categoryMultiplier = isMainClass ? 10 : isClassEntry ? 8 : 1;

      // Apply length bonus for shorter titles (favor shorter matches)
      const score = matchScore * categoryMultiplier - doc.title.length;

      results.push({ doc, score });
    }

    return results
      .sort((a, b) => b.score - a.score)
      .slice(0, MAX_DISPLAYED_RESULTS)
      .map((item) => item.doc);
  }, [searchText, allDocs]);

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

  const getIconForCategory = (category: string, type: DocItem["type"]) => {
    // Type-specific icons take priority, then category-based, then default
    return ICON_MAP[type] || ICON_MAP[category] || "../assets/icons/default.svg";
  };

  const getIcon = (name: string) => (preferences.hideIcons ? undefined : name);

  return (
    <List
      searchText={searchText}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search Roblox Creator Docs..."
      isLoading={isLoading}
      isShowingDetail={showingDetail}
    >
      <List.Section title="Results">
        {filteredDocs.map((doc) => {
          // Truncate title to prevent wrapping in list
          const maxTitleLength = 50;
          const displayTitle =
            doc.title.length > maxTitleLength ? doc.title.substring(0, maxTitleLength - 3) + "..." : doc.title;

          // Process class references in description for compact view
          // Remove markdown syntax and clean up API references
          const cleanDescription = doc.description
            .replace(/`([^`]+)`/g, "$1") // Remove backticks
            .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1") // Remove markdown links, keep text
            .replace(/(Class|Datatype|Enum|Global)\.(\w+)\.(\w+)\|(\S+)/g, "$4") // Class.Name.Prop|Display -> Display
            .replace(/(Class|Datatype|Enum|Global)\.(\w+):(\w+)\([^)]*\)\|(\S+)/g, "$4") // Class.Name:Method()|Display -> Display
            .replace(/(Class|Datatype|Enum|Global)\.(\w+)\.(\w+)/g, "$3") // Class.Name.Prop -> Prop
            .replace(/(Class|Datatype|Enum|Global)\.(\w+):(\w+)\([^)]*\)/g, "$3()") // Class.Name:Method() -> Method()
            .replace(/(Class|Datatype|Enum|Global)\.(\w+)/g, "$2"); // Class.Name -> Name
          const truncatedDescription =
            cleanDescription.length > 50 ? cleanDescription.substring(0, 47) + "..." : cleanDescription;

          return (
            <List.Item
              key={doc.id}
              icon={getIcon(getIconForCategory(doc.category, doc.type))}
              title={displayTitle}
              subtitle={!showingDetail ? doc.category : undefined}
              accessories={!showingDetail ? [{ text: doc.type }, { text: truncatedDescription }] : undefined}
              detail={showingDetail ? <List.Item.Detail markdown={renderDetailMarkdown(doc, typeLookup)} /> : undefined}
              actions={
                <ActionPanel>
                  <Action title="Open in Browser" onAction={() => open(doc.url)} icon={getIcon(ACTION_ICONS.browser)} />
                  <Action
                    title={showingDetail ? "Hide Detail" : "Show Detail"}
                    onAction={() => setShowingDetail(!showingDetail)}
                    shortcut={{ modifiers: ["cmd"], key: "d" }}
                    icon={getIcon(ACTION_ICONS.text)}
                  />
                  <Action.CopyToClipboard title="Copy URL" content={doc.url} icon={getIcon(ACTION_ICONS.clipboard)} />
                  <Action.CopyToClipboard
                    title="Copy Title"
                    content={doc.title}
                    shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
                    icon={getIcon(ACTION_ICONS.text)}
                  />
                  <Action
                    title="Refresh Data"
                    onAction={loadDocsData}
                    shortcut={{ modifiers: ["cmd"], key: "r" }}
                    icon={getIcon(ACTION_ICONS.refresh)}
                  />
                  <Action
                    title="Clear Cache & Refresh"
                    onAction={clearCacheAndRefresh}
                    shortcut={{ modifiers: ["cmd", "shift"], key: "r" }}
                    icon={getIcon(ACTION_ICONS.trash)}
                  />
                </ActionPanel>
              }
            />
          );
        })}
      </List.Section>

      {filteredDocs.length === 0 && !isLoading && (
        <List.EmptyView
          title={isSearchEmpty ? "Start Searching" : allDocs.length === 0 ? "No Data Loaded" : "No Results Found"}
          description={
            isSearchEmpty
              ? "Type to search Roblox Creator Docs"
              : allDocs.length === 0
                ? "Try refreshing with Cmd+R to load documentation data"
                : `No documentation found for "${searchText}". Try a different search term.`
          }
        />
      )}
    </List>
  );
}
