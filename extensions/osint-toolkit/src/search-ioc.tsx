/**
 * Search IOC Command
 *
 * Unified search command that auto-detects IOC type and shows relevant OSINT sources
 */

import {
  List,
  ActionPanel,
  Action,
  Icon,
  Color,
  showToast,
  Toast,
  Clipboard,
  getPreferenceValues,
  LaunchProps,
  open,
} from "@raycast/api";
import { useState, useEffect } from "react";
import { detectIOCType, defangIOC, refangIOC } from "./utils/ioc-detection";
import { getEnabledSourcesForIOCType } from "./utils/osint-sources";
import { buildSearchURL } from "./utils/url-builder";
import {
  IOCType,
  IOCDetectionResult,
  OSINTSource,
  ExtensionPreferences,
  SearchResult,
} from "./types";
import { getFavorites, toggleFavorite } from "./utils/favorites";

interface SearchIOCArguments {
  ioc?: string;
}

export default function SearchIOCCommand(
  props: LaunchProps<{ arguments: SearchIOCArguments }>,
) {
  const [searchText, setSearchText] = useState(props.arguments.ioc || "");
  const [iocDetection, setIocDetection] = useState<IOCDetectionResult | null>(
    null,
  );
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [favorites, setFavorites] = useState<string[]>([]);

  // Load favorites on mount
  useEffect(() => {
    const loadFavorites = async () => {
      const favs = await getFavorites();
      setFavorites(favs);
    };
    loadFavorites();
  }, []);

  // Auto-detect IOC type when search text changes
  useEffect(() => {
    const detectAndSearch = async () => {
      if (!searchText.trim()) {
        setIocDetection(null);
        setSearchResults([]);
        return;
      }

      setIsLoading(true);

      try {
        // Get preferences inside the effect
        const preferences = getPreferenceValues<ExtensionPreferences>();

        // Refang the IOC first if it's defanged
        const refangedIOC = refangIOC(searchText.trim());
        const detection = detectIOCType(refangedIOC);
        setIocDetection(detection);

        if (detection.isValid && detection.type !== "unknown") {
          // Get enabled sources for this IOC type
          const sources = getEnabledSourcesForIOCType(
            detection.type,
            preferences,
          );

          // Build search results
          const results: SearchResult[] = [];
          for (const source of sources) {
            const url = await buildSearchURL(
              source.id,
              detection.value,
              detection.type,
            );
            results.push({
              source,
              url,
              ioc: detection.value,
              iocType: detection.type,
            });
          }

          setSearchResults(results);
        } else {
          setSearchResults([]);
          if (searchText.length > 3) {
            showToast({
              style: Toast.Style.Failure,
              title: "Unknown IOC Type",
              message:
                "Could not detect IOC type. Try a specific search command.",
            });
          }
        }
      } catch (error) {
        console.error("Error detecting IOC:", error);
        showToast({
          style: Toast.Style.Failure,
          title: "Error",
          message:
            error instanceof Error ? error.message : "Failed to detect IOC",
        });
      } finally {
        setIsLoading(false);
      }
    };

    const timeoutId = setTimeout(detectAndSearch, 300);
    return () => clearTimeout(timeoutId);
  }, [searchText]);

  // Get preferences for the render
  const preferences = getPreferenceValues<ExtensionPreferences>();

  // Consolidate EmptyView props to ensure only one `List.EmptyView` is rendered
  const emptyViewProps = (() => {
    if (!searchText) {
      return {
        icon: { source: Icon.MagnifyingGlass, tintColor: Color.SecondaryText },
        title: "Search for IOCs",
        description:
          "Enter an IP address, domain, URL, or file hash to search across OSINT platforms",
      } as const;
    }

    if (searchText && !iocDetection) {
      return {
        icon: { source: Icon.XMarkCircle, tintColor: Color.Red },
        title: "Detecting IOC Type...",
        description: "Analyzing your input...",
      } as const;
    }

    if (iocDetection && !iocDetection.isValid) {
      return {
        icon: { source: Icon.XMarkCircle, tintColor: Color.Red },
        title: "Invalid IOC",
        description:
          "Could not detect a valid IOC type. Try using a specific search command.",
      } as const;
    }

    if (iocDetection && iocDetection.isValid && searchResults.length === 0) {
      return {
        icon: { source: Icon.ExclamationMark, tintColor: Color.Orange },
        title: "No Sources Available",
        description:
          "No OSINT sources are enabled for this IOC type. Check your preferences.",
      } as const;
    }

    return null;
  })();

  // Get IOC type icon and color
  const getIOCTypeDisplay = (
    type: IOCType,
  ): { icon: Icon; color: Color; label: string } => {
    const displays: Record<
      IOCType,
      { icon: Icon; color: Color; label: string }
    > = {
      ip: { icon: Icon.Globe, color: Color.Blue, label: "IPv4 Address" },
      ipv6: { icon: Icon.Globe, color: Color.Purple, label: "IPv6 Address" },
      domain: { icon: Icon.Link, color: Color.Green, label: "Domain" },
      url: { icon: Icon.Link, color: Color.Orange, label: "URL" },
      hash: { icon: Icon.Document, color: Color.Red, label: "File Hash" },
      email: { icon: Icon.Envelope, color: Color.Yellow, label: "Email" },
      unknown: {
        icon: Icon.QuestionMark,
        color: Color.SecondaryText,
        label: "Unknown",
      },
    };
    return displays[type] || displays.unknown;
  };

  // Get category icon
  const getCategoryIcon = (category: string): string => {
    const icons: Record<string, string> = {
      "Multi-Purpose": "🎯",
      "IP Intelligence": "🌐",
      "URL/Domain Analysis": "🔗",
      "Malware Analysis": "🦠",
      "Threat Feeds": "📡",
      "Certificate/SSL": "🔒",
    };
    return icons[category] || "🔍";
  };

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Enter IOC (IP, domain, URL, or hash)..."
      searchText={searchText}
      onSearchTextChange={setSearchText}
      throttle
    >
      {emptyViewProps && <List.EmptyView {...emptyViewProps} />}
      {iocDetection && iocDetection.isValid && searchResults.length > 0 && (
        <>
          <List.Section
            title={`${getIOCTypeDisplay(iocDetection.type).label} Detected`}
            subtitle={`${searchResults.length} sources available`}
          >
            {searchResults.map((result: SearchResult) => {
              const typeDisplay = getIOCTypeDisplay(result.iocType);
              const categoryIcon = getCategoryIcon(result.source.category);

              return (
                <List.Item
                  key={result.source.id}
                  id={result.source.id}
                  icon={{ source: Icon.Globe, tintColor: typeDisplay.color }}
                  title={result.source.name}
                  subtitle={result.source.description}
                  accessories={[
                    { text: result.source.category, icon: categoryIcon },
                    result.source.isFree
                      ? {
                          text: "Free",
                          icon: Icon.Check,
                          tooltip: "Free to use",
                        }
                      : {
                          text: "Paid",
                          icon: Icon.Lock,
                          tooltip: "Requires subscription",
                        },
                    favorites.includes(result.source.id)
                      ? {
                          icon: Icon.Star,
                          tooltip: "Favorite",
                        }
                      : {},
                  ]}
                  actions={
                    <ActionPanel>
                      <ActionPanel.Section title="Actions">
                        <Action.OpenInBrowser
                          title={`Search in ${result.source.name}`}
                          url={result.url}
                          icon={Icon.MagnifyingGlass}
                          onOpen={() => {
                            if (preferences.copy_on_select) {
                              Clipboard.copy(result.ioc);
                              showToast({
                                style: Toast.Style.Success,
                                title: "IOC Copied",
                                message: `${result.ioc} copied to clipboard`,
                              });
                            }
                          }}
                        />
                        <Action.CopyToClipboard
                          title="Copy Search URL"
                          content={result.url}
                          shortcut={{ modifiers: ["cmd"], key: "c" }}
                        />
                        <Action.CopyToClipboard
                          title="Copy IOC"
                          content={result.ioc}
                          shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
                        />
                        <Action.CopyToClipboard
                          title="Copy Defanged IOC"
                          content={defangIOC(result.ioc, result.iocType)}
                          shortcut={{ modifiers: ["cmd", "opt"], key: "c" }}
                        />
                      </ActionPanel.Section>
                      <ActionPanel.Section title="Open All">
                        <Action
                          title="Open All Favorites"
                          icon={Icon.Star}
                          shortcut={{ modifiers: ["cmd", "opt"], key: "o" }}
                          onAction={async () => {
                            const favoriteResults = searchResults.filter(
                              (res) => favorites.includes(res.source.id),
                            );
                            if (favoriteResults.length === 0) {
                              showToast({
                                style: Toast.Style.Failure,
                                title: "No Favorites",
                                message:
                                  "No favorite sources for this IOC type",
                              });
                              return;
                            }
                            for (const res of favoriteResults) {
                              await open(res.url);
                            }
                            showToast({
                              style: Toast.Style.Success,
                              title: "Opened Favorites",
                              message: `Opened ${favoriteResults.length} favorite sources`,
                            });
                          }}
                        />
                        <Action
                          title="Open All Sources"
                          icon={Icon.AppWindowGrid3x3}
                          shortcut={{ modifiers: ["cmd", "shift"], key: "o" }}
                          onAction={async () => {
                            for (const res of searchResults) {
                              await open(res.url);
                            }
                            showToast({
                              style: Toast.Style.Success,
                              title: "Opened All Sources",
                              message: `Opened ${searchResults.length} sources`,
                            });
                          }}
                        />
                      </ActionPanel.Section>
                      <ActionPanel.Section title="Favorites">
                        <Action
                          title={
                            favorites.includes(result.source.id)
                              ? "Remove from Favorites"
                              : "Add to Favorites"
                          }
                          icon={
                            favorites.includes(result.source.id)
                              ? Icon.StarDisabled
                              : Icon.Star
                          }
                          shortcut={{ modifiers: ["cmd"], key: "f" }}
                          onAction={async () => {
                            const newIsFavorite = await toggleFavorite(
                              result.source.id,
                            );
                            const updatedFavorites = await getFavorites();
                            setFavorites(updatedFavorites);
                            showToast({
                              style: Toast.Style.Success,
                              title: newIsFavorite
                                ? "Added to Favorites"
                                : "Removed from Favorites",
                              message: result.source.name,
                            });
                          }}
                        />
                      </ActionPanel.Section>
                      <ActionPanel.Section title="Info">
                        <Action.Push
                          title="View Source Details"
                          icon={Icon.Info}
                          target={
                            <SourceDetailView
                              source={result.source}
                              ioc={result.ioc}
                              url={result.url}
                            />
                          }
                        />
                      </ActionPanel.Section>
                    </ActionPanel>
                  }
                />
              );
            })}
          </List.Section>
        </>
      )}
    </List>
  );
}

/**
 * Detail view for OSINT source information
 */
function SourceDetailView({
  source,
  ioc,
  url,
}: {
  source: OSINTSource;
  ioc: string;
  url: string;
}) {
  const markdown = `
# ${source.name}

${source.description}

## Information

- **Category**: ${source.category}
- **Free**: ${source.isFree ? "Yes" : "No"}
- **Requires Authentication**: ${source.requiresAuth ? "Yes" : "No"}
- **Supported IOC Types**: ${source.supportedTypes.join(", ")}

## Search Details

- **IOC**: \`${ioc}\`
- **Search URL**: [${url}](${url})

## About

${source.name} is part of the ${source.category} category and supports searching for ${source.supportedTypes.join(", ")} indicators.

${
  source.isFree
    ? "This is a free service that doesn't require an API key for basic lookups."
    : "This service may require a subscription or API key for full access."
}
`;

  return (
    <List>
      <List.Item
        title={source.name}
        detail={<List.Item.Detail markdown={markdown} />}
        actions={
          <ActionPanel>
            <Action.OpenInBrowser title="Open in Browser" url={url} />
            <Action.CopyToClipboard title="Copy URL" content={url} />
            <Action.CopyToClipboard title="Copy IOC" content={ioc} />
          </ActionPanel>
        }
      />
    </List>
  );
}
