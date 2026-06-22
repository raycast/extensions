/**
 * OSINT Web Check (unified)
 *
 * Single Raycast command that accepts a URL, domain, IP, IPv6, or file
 * hash in the search bar and renders two surfaces:
 *   1. A "Web Check" section — a single row whose detail panel runs
 *      12 per-section web-checks (DNS, SSL, ports, headers, etc.).
 *   2. An "External OSINT Lookups" section — one row per enabled
 *      OSINT source (VirusTotal, Shodan, AbuseIPDB, ...).
 *
 * Replaces the previous pair of commands (`osint-web-check` and
 * `search-ioc`) with one entry point. The `url` argument is optional;
 * if provided, it seeds the search bar on launch.
 */

import {
  List,
  Detail,
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
import { showFailureToast } from "@raycast/utils";
import { useState, useEffect, useRef } from "react";
import { CheckDetails } from "./components/CheckDetails";
import { getRenderMode } from "./components/renderMode";
import { defangIOC } from "./osint-ioc/utils/ioc-detection";
import { buildSearchURL } from "./osint-ioc/utils/url-builder";
import { getFavorites, toggleFavorite } from "./osint-ioc/utils/favorites";
import { IOCType, OSINTSource } from "./osint-ioc/ioc-types";

export default function OsintWebCheck(props: LaunchProps<{ arguments: { url?: string } }>) {
  const [searchText, setSearchText] = useState(props.arguments.url ?? "");
  const [favorites, setFavorites] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [osintResults, setOsintResults] = useState<Array<{ source: OSINTSource; url: string }>>([]);
  const searchRequestId = useRef(0);

  // Load favorites on mount
  useEffect(() => {
    const loadFavorites = async () => {
      const favs = await getFavorites();
      setFavorites(favs);
    };
    loadFavorites();
  }, []);

  // Debounced: detect IOC type and build search URLs for enabled sources
  useEffect(() => {
    const requestId = ++searchRequestId.current;

    const resolve = async () => {
      const trimmed = searchText.trim();
      if (!trimmed) {
        if (searchRequestId.current === requestId) {
          setOsintResults([]);
          setIsLoading(false);
        }
        return;
      }

      if (searchRequestId.current === requestId) {
        setIsLoading(true);
      }

      try {
        const preferences = getPreferenceValues<Preferences>();
        const mode = getRenderMode(trimmed, preferences);
        if (searchRequestId.current !== requestId) return;

        if (mode.iocType === "unknown" || !mode.ioc) {
          setOsintResults([]);
          return;
        }

        const results: Array<{ source: OSINTSource; url: string }> = [];
        for (const source of mode.osintSources) {
          const url = await buildSearchURL(source.id, mode.ioc, mode.iocType);
          results.push({ source, url });
          if (searchRequestId.current !== requestId) return;
        }

        setOsintResults(results);
      } catch (error) {
        console.error("Error resolving IOC:", error);
        const message = error instanceof Error ? error.message : String(error);
        await showFailureToast(new Error(message || "Unknown error detecting IOC"), {
          title: "Error detecting IOC",
        });
      } finally {
        if (searchRequestId.current === requestId) {
          setIsLoading(false);
        }
      }
    };

    const timeoutId = setTimeout(resolve, 300);
    return () => clearTimeout(timeoutId);
  }, [searchText]);

  // Compute render mode (cheap; pure)
  const preferences = getPreferenceValues<Preferences>();
  const mode = getRenderMode(searchText, preferences);
  const showDeepDive = mode.deepDiveUrl !== null;
  const showOsint = osintResults.length > 0;

  // EmptyView branching
  type EmptyViewProps = {
    icon: { source: Icon; tintColor: Color };
    title: string;
    description: string;
  };
  const emptyViewProps: EmptyViewProps | null = (() => {
    if (!searchText.trim()) {
      return {
        icon: { source: Icon.MagnifyingGlass, tintColor: Color.SecondaryText },
        title: "Search for an IOC or enter a URL",
        description:
          "Enter a URL, domain, IP address, IPv6, or file hash to run web checks and external OSINT lookups.",
      };
    }
    if (searchText.trim() && isLoading) {
      return {
        icon: { source: Icon.MagnifyingGlass, tintColor: Color.SecondaryText },
        title: "Detecting IOC Type...",
        description: "Analyzing your input...",
      };
    }
    if (mode.iocType === "unknown" || !mode.ioc) {
      return {
        icon: { source: Icon.XMarkCircle, tintColor: Color.Red },
        title: "Invalid IOC",
        description: "Could not detect a valid URL, domain, IP, or hash. Try a more specific input.",
      };
    }
    if (!showDeepDive && !showOsint) {
      return {
        icon: { source: Icon.ExclamationMark, tintColor: Color.Orange },
        title: "No Sources Available",
        description: "No OSINT sources or web checks are available for this input. Check your preferences.",
      };
    }
    return null;
  })();

  const getIOCTypeDisplay = (type: IOCType): { icon: Icon; color: Color; label: string } => {
    const displays: Record<IOCType, { icon: Icon; color: Color; label: string }> = {
      ip: { icon: Icon.Globe, color: Color.Blue, label: "IPv4 Address" },
      ipv6: { icon: Icon.Globe, color: Color.Purple, label: "IPv6 Address" },
      domain: { icon: Icon.Link, color: Color.Green, label: "Domain" },
      url: { icon: Icon.Link, color: Color.Orange, label: "URL" },
      hash: { icon: Icon.Document, color: Color.Red, label: "File Hash" },
      unknown: { icon: Icon.QuestionMark, color: Color.SecondaryText, label: "Unknown" },
    };
    return displays[type] || displays.unknown;
  };

  const getCategoryLabel = (category: string): string => {
    const icons: Record<string, string> = {
      "Multi-Purpose": "🎯",
      "IP Intelligence": "🌐",
      "URL Analysis": "🔗",
      "Domain Analysis": "🔗",
      "Malware Analysis": "🦠",
      "Threat Intelligence": "📡",
      "Certificate Analysis": "🔒",
    };
    return `${icons[category] || "🔍"} ${category}`;
  };

  return (
    <List
      isLoading={isLoading}
      isShowingDetail
      searchBarPlaceholder="Enter a URL, domain, IP, or hash..."
      searchText={searchText}
      onSearchTextChange={setSearchText}
      throttle
    >
      {emptyViewProps && <List.EmptyView {...emptyViewProps} />}

      {showDeepDive &&
        mode.deepDiveUrl &&
        (() => {
          const deepDiveUrl = mode.deepDiveUrl as string;
          return (
            <List.Section title="Web Check" subtitle={deepDiveUrl}>
              <List.Item
                title="Web Check"
                subtitle={deepDiveUrl}
                icon={{ source: Icon.MagnifyingGlass, tintColor: Color.Blue }}
                actions={
                  <ActionPanel>
                    <Action.Push
                      title="Open Web Check"
                      icon={Icon.MagnifyingGlass}
                      target={<CheckDetails url={deepDiveUrl} enabled={mode.deepDiveEnabled} />}
                    />
                    <Action.OpenInBrowser
                      title="Open URL in Browser"
                      url={deepDiveUrl}
                      icon={Icon.Globe}
                      onOpen={() => {
                        if (preferences.copy_on_open) {
                          Clipboard.copy(deepDiveUrl);
                          showToast({
                            style: Toast.Style.Success,
                            title: "URL Copied",
                            message: `${deepDiveUrl} copied to clipboard`,
                          });
                        }
                      }}
                    />
                    <Action.CopyToClipboard title="Copy URL" content={deepDiveUrl} />
                  </ActionPanel>
                }
              />
            </List.Section>
          );
        })()}

      {showOsint && (
        <List.Section title="External OSINT Lookups" subtitle={`${osintResults.length} sources available`}>
          {osintResults.map(({ source, url }) => {
            const typeDisplay = getIOCTypeDisplay(mode.iocType);
            const accessories = [
              { text: getCategoryLabel(source.category) },
              source.isFree
                ? { text: "Free", icon: Icon.Check, tooltip: "Free to use" }
                : { text: "Paid", icon: Icon.Lock, tooltip: "Requires subscription" },
              ...(favorites.includes(source.id) ? [{ icon: Icon.Star, tooltip: "Favorite" }] : []),
            ];

            return (
              <List.Item
                key={source.id}
                id={source.id}
                icon={{ source: Icon.Globe, tintColor: typeDisplay.color }}
                title={source.name}
                subtitle={source.description}
                accessories={accessories}
                actions={
                  <ActionPanel>
                    <ActionPanel.Section title="Actions">
                      <Action.OpenInBrowser
                        title={`Search in ${source.name}`}
                        url={url}
                        icon={Icon.MagnifyingGlass}
                        onOpen={() => {
                          if (preferences.copy_on_open) {
                            Clipboard.copy(mode.ioc);
                            showToast({
                              style: Toast.Style.Success,
                              title: "IOC Copied",
                              message: `${mode.ioc} copied to clipboard`,
                            });
                          }
                        }}
                      />
                      <Action.CopyToClipboard
                        title="Copy Search URL"
                        content={url}
                        shortcut={{ modifiers: ["cmd"], key: "c" }}
                      />
                      <Action.CopyToClipboard
                        title="Copy IOC"
                        content={mode.ioc}
                        shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
                      />
                      <Action.CopyToClipboard
                        title="Copy Defanged IOC"
                        content={defangIOC(mode.ioc, mode.iocType)}
                        shortcut={{ modifiers: ["cmd", "opt"], key: "c" }}
                      />
                    </ActionPanel.Section>
                    <ActionPanel.Section title="Open All">
                      <Action
                        title="Open All Favorites"
                        icon={Icon.Star}
                        shortcut={{ modifiers: ["cmd", "opt"], key: "o" }}
                        onAction={async () => {
                          const favoriteResults = osintResults.filter((res) => favorites.includes(res.source.id));
                          if (favoriteResults.length === 0) {
                            await showFailureToast(new Error("No favorite sources for this IOC type"), {
                              title: "No Favorites",
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
                          for (const res of osintResults) {
                            await open(res.url);
                          }
                          showToast({
                            style: Toast.Style.Success,
                            title: "Opened All Sources",
                            message: `Opened ${osintResults.length} sources`,
                          });
                        }}
                      />
                    </ActionPanel.Section>
                    <ActionPanel.Section title="Favorites">
                      <Action
                        title={favorites.includes(source.id) ? "Remove from Favorites" : "Add to Favorites"}
                        icon={favorites.includes(source.id) ? Icon.StarDisabled : Icon.Star}
                        shortcut={{ modifiers: ["cmd"], key: "f" }}
                        onAction={async () => {
                          const newIsFavorite = await toggleFavorite(source.id);
                          const updatedFavorites = await getFavorites();
                          setFavorites(updatedFavorites);
                          showToast({
                            style: Toast.Style.Success,
                            title: newIsFavorite ? "Added to Favorites" : "Removed from Favorites",
                            message: source.name,
                          });
                        }}
                      />
                    </ActionPanel.Section>
                    <ActionPanel.Section title="Info">
                      <Action.Push
                        title="View Source Details"
                        icon={Icon.Info}
                        target={<SourceDetailView source={source} ioc={mode.ioc} url={url} />}
                      />
                    </ActionPanel.Section>
                  </ActionPanel>
                }
              />
            );
          })}
        </List.Section>
      )}
    </List>
  );
}

/**
 * Detail view for OSINT source information
 */
function SourceDetailView({ source, ioc, url }: { source: OSINTSource; ioc: string; url: string }) {
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
    <Detail
      markdown={markdown}
      actions={
        <ActionPanel>
          <Action.OpenInBrowser title="Open in Browser" url={url} />
          <Action.CopyToClipboard title="Copy Search URL" content={url} />
          <Action.CopyToClipboard title="Copy IOC" content={ioc} />
        </ActionPanel>
      }
    />
  );
}
