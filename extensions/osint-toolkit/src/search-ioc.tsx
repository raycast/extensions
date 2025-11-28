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
  confirmAlert,
  Alert,
} from "@raycast/api";
import { useState, useEffect } from "react";
import {
  detectIOCType,
  defangIOC,
  refangIOC,
  extractIOCStrings,
} from "./utils/ioc-detection";
import { getEnabledSourcesForIOCType } from "./utils/osint-sources";
import { buildSearchURL } from "./utils/url-builder";
import {
  IOCType,
  IOCDetectionResult,
  OSINTSource,
  ExtensionPreferences,
  SearchResult,
} from "./types";
import {
  addRecentIOC,
  getStoredIOCs,
  removeIOC,
  StoredIOC,
  toggleStarIOC,
  clearHistory,
} from "./utils/storage";

interface IOCWithResults {
  detection: IOCDetectionResult;
  results: SearchResult[];
}

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
  const [iocResults, setIocResults] = useState<IOCWithResults[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [storedIOCs, setStoredIOCs] = useState<StoredIOC[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");

  // Load stored IOCs on mount
  useEffect(() => {
    const loadStored = async () => {
      const items = await getStoredIOCs();
      setStoredIOCs(items);
    };
    loadStored();
  }, []);

  // Auto-detect IOC type when search text changes
  useEffect(() => {
    const detectAndSearch = async () => {
      if (!searchText.trim()) {
        setIocDetection(null);
        setIocResults([]);
        return;
      }

      setIsLoading(true);

      try {
        // Get preferences inside the effect
        const preferences = getPreferenceValues<ExtensionPreferences>();
        // Extract IOC-like tokens from arbitrary pasted text (emails, logs, etc.)
        const lines = extractIOCStrings(searchText).map((part) => part.trim());

        if (lines.length === 0) {
          setIocDetection(null);
          setIocResults([]);
          return;
        }

        const perIocResults: IOCWithResults[] = [];
        let firstDetection: IOCDetectionResult | null = null;

        for (const line of lines) {
          const refangedIOC = refangIOC(line);
          const detection = detectIOCType(refangedIOC);

          if (!firstDetection) {
            firstDetection = detection;
          }

          if (detection.isValid && detection.type !== "unknown") {
            const sources = await getEnabledSourcesForIOCType(
              detection.type,
              preferences,
            );

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

            if (results.length > 0) {
              perIocResults.push({ detection, results });

              await addRecentIOC(detection.value, detection.type);
            }
          }
        }

        const updatedStored = await getStoredIOCs();
        setStoredIOCs(updatedStored);
        setIocDetection(firstDetection);
        setIocResults(perIocResults);

        if (perIocResults.length === 0 && searchText.length > 3) {
          showToast({
            style: Toast.Style.Failure,
            title: "Unknown or Unsupported IOCs",
            message:
              "Could not detect valid IOC types. Try a specific search command.",
          });
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
      "Threat Intelligence": "📡",
      "Certificate/SSL": "🔒",
    };
    return icons[category] || "🔍";
  };

  const filteredResults = (results: SearchResult[]): SearchResult[] => {
    if (selectedCategory === "all") {
      return results;
    }
    return results.filter(
      (result) => result.source.category === selectedCategory,
    );
  };

  const starredIOCs = storedIOCs.filter((item) => item.starred);
  const recentIOCs = storedIOCs.filter((item) => !item.starred);

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Enter IOC (IP, domain, URL, or hash)..."
      searchText={searchText}
      onSearchTextChange={setSearchText}
      searchBarAccessory={
        storedIOCs.length > 0 || iocResults.length > 0 ? (
          <List.Dropdown
            tooltip="Filter by Source Category"
            storeValue
            onChange={setSelectedCategory}
          >
            <List.Dropdown.Item title="All Categories" value="all" />
            <List.Dropdown.Item title="Multi-Purpose" value="Multi-Purpose" />
            <List.Dropdown.Item
              title="IP Intelligence"
              value="IP Intelligence"
            />
            <List.Dropdown.Item
              title="URL/Domain Analysis"
              value="URL/Domain Analysis"
            />
            <List.Dropdown.Item
              title="Malware Analysis"
              value="Malware Analysis"
            />
            <List.Dropdown.Item
              title="Threat Intelligence"
              value="Threat Intelligence"
            />
            <List.Dropdown.Item
              title="Certificate/SSL"
              value="Certificate/SSL"
            />
          </List.Dropdown>
        ) : undefined
      }
      throttle
    >
      {!searchText && storedIOCs.length === 0 && (
        <List.EmptyView
          icon={{
            source: Icon.MagnifyingGlass,
            tintColor: Color.SecondaryText,
          }}
          title="Search for IOCs"
          description="Paste logs, emails, or text blobs and we'll extract IOCs automatically (IPs, domains, URLs, hashes, emails)."
        />
      )}

      {!searchText && storedIOCs.length > 0 && (
        <>
          {starredIOCs.length > 0 && (
            <List.Section title="Starred IOCs">
              {starredIOCs.map((item) => {
                const typeDisplay = getIOCTypeDisplay(item.type);
                return (
                  <List.Item
                    key={`starred-${item.type}-${item.value}`}
                    icon={{
                      source: typeDisplay.icon,
                      tintColor: typeDisplay.color,
                    }}
                    title={item.value}
                    subtitle={typeDisplay.label}
                    accessories={[{ icon: Icon.Star }]}
                    actions={
                      <ActionPanel>
                        <Action
                          title="Search This Ioc"
                          icon={Icon.MagnifyingGlass}
                          onAction={() => setSearchText(item.value)}
                        />
                        <Action
                          title="Unstar Ioc"
                          icon={Icon.StarDisabled}
                          onAction={async () => {
                            await toggleStarIOC(item.value, item.type);
                            const updated = await getStoredIOCs();
                            setStoredIOCs(updated);
                          }}
                        />
                        <Action
                          title="Remove from History"
                          icon={Icon.Trash}
                          style={Action.Style.Destructive}
                          onAction={async () => {
                            await removeIOC(item.value, item.type);
                            const updated = await getStoredIOCs();
                            setStoredIOCs(updated);
                          }}
                        />
                        <Action
                          title="Clear All History"
                          icon={Icon.Trash}
                          style={Action.Style.Destructive}
                          shortcut={{
                            modifiers: ["cmd", "shift"],
                            key: "delete",
                          }}
                          onAction={async () => {
                            if (
                              await confirmAlert({
                                title: "Clear All History?",
                                message: "This action cannot be undone.",
                                primaryAction: {
                                  title: "Clear History",
                                  style: Alert.ActionStyle.Destructive,
                                },
                              })
                            ) {
                              await clearHistory();
                              setStoredIOCs([]);
                              showToast({
                                style: Toast.Style.Success,
                                title: "History Cleared",
                              });
                            }
                          }}
                        />
                      </ActionPanel>
                    }
                  />
                );
              })}
            </List.Section>
          )}

          {recentIOCs.length > 0 && (
            <List.Section title="Recent IOCs">
              {recentIOCs.map((item) => {
                const typeDisplay = getIOCTypeDisplay(item.type);
                return (
                  <List.Item
                    key={`recent-${item.type}-${item.value}`}
                    icon={{
                      source: typeDisplay.icon,
                      tintColor: typeDisplay.color,
                    }}
                    title={item.value}
                    subtitle={typeDisplay.label}
                    actions={
                      <ActionPanel>
                        <Action
                          title="Search This Ioc"
                          icon={Icon.MagnifyingGlass}
                          onAction={() => setSearchText(item.value)}
                        />
                        <Action
                          title="Star Ioc"
                          icon={Icon.Star}
                          onAction={async () => {
                            await toggleStarIOC(item.value, item.type);
                            const updated = await getStoredIOCs();
                            setStoredIOCs(updated);
                          }}
                        />
                        <Action
                          title="Remove from History"
                          icon={Icon.Trash}
                          style={Action.Style.Destructive}
                          onAction={async () => {
                            await removeIOC(item.value, item.type);
                            const updated = await getStoredIOCs();
                            setStoredIOCs(updated);
                          }}
                        />
                        <Action
                          title="Clear All History"
                          icon={Icon.Trash}
                          style={Action.Style.Destructive}
                          shortcut={{
                            modifiers: ["cmd", "shift"],
                            key: "delete",
                          }}
                          onAction={async () => {
                            if (
                              await confirmAlert({
                                title: "Clear All History?",
                                message: "This action cannot be undone.",
                                primaryAction: {
                                  title: "Clear History",
                                  style: Alert.ActionStyle.Destructive,
                                },
                              })
                            ) {
                              await clearHistory();
                              setStoredIOCs([]);
                              showToast({
                                style: Toast.Style.Success,
                                title: "History Cleared",
                              });
                            }
                          }}
                        />
                      </ActionPanel>
                    }
                  />
                );
              })}
            </List.Section>
          )}
        </>
      )}

      {searchText && !iocDetection && (
        <List.EmptyView
          icon={{ source: Icon.XMarkCircle, tintColor: Color.Red }}
          title="Detecting IOC Type..."
          description="Analyzing your input..."
        />
      )}

      {iocDetection && !iocDetection.isValid && (
        <List.EmptyView
          icon={{ source: Icon.XMarkCircle, tintColor: Color.Red }}
          title="Invalid IOC"
          description="Could not detect a valid IOC type. Try using a specific search command."
        />
      )}

      {iocDetection && iocDetection.isValid && iocResults.length === 0 && (
        <List.EmptyView
          icon={{ source: Icon.ExclamationMark, tintColor: Color.Orange }}
          title="No Sources Available"
          description="No OSINT sources are enabled for this IOC type. Check your preferences."
        />
      )}

      {iocResults.length > 0 && (
        <>
          {iocResults.map(({ detection, results }) => {
            const filtered = filteredResults(results);
            if (filtered.length === 0) {
              return null;
            }

            const typeDisplay = getIOCTypeDisplay(detection.type);

            const countsByCategory = filtered.reduce<Record<string, number>>(
              (acc, r) => {
                acc[r.source.category] = (acc[r.source.category] ?? 0) + 1;
                return acc;
              },
              {},
            );

            const summaryText =
              Object.entries(countsByCategory)
                .map(([cat, count]) => `${count} ${cat}`)
                .join(" • ") || `${filtered.length} sources`;

            const summaryOnly = Boolean(preferences.summary_only_mode);

            return (
              <List.Section
                key={`${detection.type}-${detection.value}`}
                title={`${detection.value}`}
                subtitle={`${typeDisplay.label} • ${filtered.length} sources`}
              >
                <List.Item
                  key={`${detection.value}-summary`}
                  icon={{
                    source: typeDisplay.icon,
                    tintColor: typeDisplay.color,
                  }}
                  title="Summary"
                  subtitle={summaryText}
                  accessories={[{ text: `${filtered.length} sources` }]}
                  actions={
                    <ActionPanel>
                      <Action
                        title="Open All Sources for This Ioc"
                        icon={Icon.AppWindowGrid3x3}
                        shortcut={{
                          modifiers: ["cmd", "shift"],
                          key: "o",
                        }}
                        onAction={async () => {
                          const toOpen = filtered.slice(0, 5);
                          for (const res of toOpen) {
                            await open(res.url);
                          }
                          if (filtered.length > 5) {
                            showToast({
                              style: Toast.Style.Success,
                              title: "Opened First 5 Sources",
                              message: `${filtered.length - 5} more sources available`,
                            });
                          }
                        }}
                      />
                    </ActionPanel>
                  }
                />

                {!summaryOnly &&
                  filtered.map((result) => {
                    const resultTypeDisplay = getIOCTypeDisplay(result.iocType);
                    const categoryIcon = getCategoryIcon(
                      result.source.category,
                    );

                    return (
                      <List.Item
                        key={`${detection.value}-${result.source.id}`}
                        id={result.source.id}
                        icon={{
                          source: Icon.Globe,
                          tintColor: resultTypeDisplay.color,
                        }}
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
                                title="Copy Ioc"
                                content={result.ioc}
                                shortcut={{
                                  modifiers: ["cmd", "shift"],
                                  key: "c",
                                }}
                              />
                              <Action.CopyToClipboard
                                title="Copy Defanged Ioc"
                                content={defangIOC(result.ioc, result.iocType)}
                                shortcut={{
                                  modifiers: ["cmd", "opt"],
                                  key: "c",
                                }}
                              />
                              <Action
                                title="Open All Sources for This Ioc"
                                icon={Icon.AppWindowGrid3x3}
                                shortcut={{
                                  modifiers: ["cmd", "shift"],
                                  key: "o",
                                }}
                                onAction={async () => {
                                  const toOpen = filtered.slice(0, 5);
                                  for (const res of toOpen) {
                                    await open(res.url);
                                  }
                                  if (filtered.length > 5) {
                                    showToast({
                                      style: Toast.Style.Success,
                                      title: "Opened First 5 Sources",
                                      message: `${filtered.length - 5} more sources available`,
                                    });
                                  }
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

                              {detection.type === "email" &&
                                preferences.show_hibp_quick_link !== false &&
                                (() => {
                                  const hibp = filtered.find(
                                    (r) => r.source.id === "haveibeenpwned",
                                  );
                                  if (!hibp) return null;
                                  return (
                                    <List.Item
                                      key={`${detection.value}-hibp`}
                                      icon={{
                                        source: Icon.Envelope,
                                        tintColor: Color.Yellow,
                                      }}
                                      title="Quick Check: Have I Been Pwned"
                                      subtitle="Check if this email appeared in a breach"
                                      accessories={[]}
                                      actions={
                                        <ActionPanel>
                                          <Action.OpenInBrowser
                                            title="Open Have I Been Pwned"
                                            url={hibp.url}
                                          />
                                          <Action.CopyToClipboard
                                            title="Copy Hibp URL"
                                            content={hibp.url}
                                          />
                                        </ActionPanel>
                                      }
                                    />
                                  );
                                })()}
                            </ActionPanel.Section>
                          </ActionPanel>
                        }
                      />
                    );
                  })}
              </List.Section>
            );
          })}
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
            <Action.CopyToClipboard title="Copy Ioc" content={ioc} />
          </ActionPanel>
        }
      />
    </List>
  );
}
