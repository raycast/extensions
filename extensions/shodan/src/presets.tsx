import { useState, useMemo } from "react";
import {
  List,
  ActionPanel,
  Action,
  Icon,
  useNavigation,
  Color,
} from "@raycast/api";
import { useFavorites } from "./hooks/useFavorites";
import { useShodanSearch } from "./hooks/useShodanSearch";
import { HostDetailView } from "./components/HostDetailView";
import {
  PRESET_QUERIES,
  getCategoryDisplayName,
  getPresetCategories,
} from "./data/presets";
import { PresetQuery, PresetCategory } from "./api/types";
import {
  getPortColor,
  getServiceNameForPort,
  truncateString,
  getRiskColor,
} from "./utils/formatters";
import { copyAsCSV, copyAsJSON } from "./utils/export";
import { filterResults } from "./utils/filter";

function PresetResultsView({
  preset,
  onBack,
}: {
  preset: PresetQuery;
  onBack: () => void;
}) {
  const { push } = useNavigation();
  const { addFavorite } = useFavorites();
  const [filterQuery, setFilterQuery] = useState("");

  const { results, total, isLoading } = useShodanSearch({
    query: preset.query,
    enabled: true,
  });

  // Apply client-side filtering
  const filteredResults = useMemo(() => {
    return filterResults(results, filterQuery);
  }, [results, filterQuery]);

  const handleSaveToFavorites = async () => {
    await addFavorite(preset.name, preset.query, preset.description);
  };

  const isFiltering = filterQuery.trim().length > 0;
  const displayResults = isFiltering ? filteredResults : results;

  return (
    <List
      isLoading={isLoading}
      navigationTitle={preset.name}
      searchBarPlaceholder="Filter results (e.g., country:us, port:443)..."
      onSearchTextChange={setFilterQuery}
      filtering={false}
    >
      {displayResults.length === 0 && !isLoading && (
        <List.EmptyView
          title={isFiltering ? "No Matching Results" : "No Results Found"}
          description={
            isFiltering
              ? `No results match "${filterQuery}". Try a different filter.`
              : "No results for this preset query."
          }
          icon={Icon.XMarkCircle}
          actions={
            <ActionPanel>
              <Action title="Go Back" icon={Icon.ArrowLeft} onAction={onBack} />
              <Action
                title="Save to Favorites"
                icon={Icon.Star}
                onAction={handleSaveToFavorites}
              />
            </ActionPanel>
          }
        />
      )}

      {displayResults.length > 0 && (
        <List.Section
          title={preset.name}
          subtitle={
            isFiltering
              ? `${filteredResults.length} of ${total.toLocaleString()} matches`
              : `${total.toLocaleString()} total matches`
          }
        >
          {displayResults.map((result, index) => {
            const vulnCount = result.vulns
              ? Object.keys(result.vulns).length
              : 0;
            const subtitle = [
              result.product &&
                `${result.product}${result.version ? ` ${result.version}` : ""}`,
              result.org,
            ]
              .filter(Boolean)
              .join(" | ");

            return (
              <List.Item
                key={`${result.ip_str}-${result.port}-${index}`}
                title={result.ip_str}
                subtitle={truncateString(subtitle, 50)}
                icon={{ source: Icon.Globe, tintColor: Color.Blue }}
                accessories={[
                  {
                    tag: {
                      value: `${result.port}`,
                      color: getPortColor(result.port),
                    },
                    tooltip: getServiceNameForPort(result.port),
                  },
                  vulnCount > 0
                    ? {
                        tag: {
                          value: `${vulnCount} CVE${vulnCount > 1 ? "s" : ""}`,
                          color: Color.Red,
                        },
                      }
                    : null,
                  {
                    text: `${result.location.city || "Unknown"}, ${result.location.country_code}`,
                  },
                ].filter((a): a is NonNullable<typeof a> => a !== null)}
                actions={
                  <ActionPanel>
                    <Action
                      title="View Details"
                      icon={Icon.Eye}
                      onAction={() =>
                        push(
                          <HostDetailView
                            ip={result.ip_str}
                            searchMatch={result}
                          />,
                        )
                      }
                    />
                    <Action.CopyToClipboard
                      title="Copy IP"
                      content={result.ip_str}
                      shortcut={{ modifiers: ["cmd"], key: "c" }}
                    />
                    <Action
                      title="Save to Favorites"
                      icon={{ source: Icon.Star, tintColor: Color.Yellow }}
                      onAction={handleSaveToFavorites}
                      shortcut={{ modifiers: ["cmd"], key: "s" }}
                    />
                    <Action
                      title="Go Back"
                      icon={Icon.ArrowLeft}
                      onAction={onBack}
                    />
                    <Action
                      title="Export All as JSON"
                      icon={Icon.Download}
                      onAction={() => copyAsJSON(displayResults, "All results")}
                    />
                    <Action
                      title="Export All as Csv"
                      icon={Icon.Download}
                      onAction={() => copyAsCSV(displayResults)}
                    />
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

export default function PresetsCommand() {
  const [selectedPreset, setSelectedPreset] = useState<PresetQuery | null>(
    null,
  );
  const { addFavorite } = useFavorites();
  const categories = getPresetCategories();

  if (selectedPreset) {
    return (
      <PresetResultsView
        preset={selectedPreset}
        onBack={() => setSelectedPreset(null)}
      />
    );
  }

  const getCategoryIcon = (category: PresetCategory): Icon => {
    const icons: Record<PresetCategory, Icon> = {
      webcams: Icon.Video,
      industrial: Icon.Gear,
      databases: Icon.HardDrive,
      network: Icon.Network,
      authentication: Icon.Key,
      vulnerabilities: Icon.Bug,
      iot: Icon.House,
      cloud: Icon.Cloud,
      remote: Icon.Desktop,
      storage: Icon.Folder,
      home: Icon.House,
      printers: Icon.Print,
      misc: Icon.Stars,
    };
    return icons[category];
  };

  return (
    <List searchBarPlaceholder="Search preset queries...">
      {categories.map((category) => {
        const presets = PRESET_QUERIES.filter((p) => p.category === category);
        return (
          <List.Section
            key={category}
            title={getCategoryDisplayName(category)}
            subtitle={`${presets.length} queries`}
          >
            {presets.map((preset) => (
              <List.Item
                key={preset.id}
                title={preset.name}
                subtitle={preset.description}
                icon={{
                  source: getCategoryIcon(category),
                  tintColor: getRiskColor(preset.risk),
                }}
                accessories={[
                  {
                    tag: {
                      value: preset.risk.toUpperCase(),
                      color: getRiskColor(preset.risk),
                    },
                    tooltip: `Risk level: ${preset.risk}`,
                  },
                ]}
                actions={
                  <ActionPanel>
                    <ActionPanel.Section title="Run">
                      <Action
                        title="Run Query"
                        icon={Icon.MagnifyingGlass}
                        onAction={() => setSelectedPreset(preset)}
                      />
                    </ActionPanel.Section>

                    <ActionPanel.Section title="Copy">
                      <Action.CopyToClipboard
                        title="Copy Query"
                        content={preset.query}
                        shortcut={{ modifiers: ["cmd"], key: "c" }}
                      />
                    </ActionPanel.Section>

                    <ActionPanel.Section title="Save">
                      <Action
                        title="Add to Favorites"
                        icon={{ source: Icon.Star, tintColor: Color.Yellow }}
                        onAction={() =>
                          addFavorite(
                            preset.name,
                            preset.query,
                            preset.description,
                          )
                        }
                        shortcut={{ modifiers: ["cmd"], key: "s" }}
                      />
                    </ActionPanel.Section>

                    <ActionPanel.Section title="External">
                      <Action.OpenInBrowser
                        title="Run on Shodan Website"
                        url={`https://www.shodan.io/search?query=${encodeURIComponent(preset.query)}`}
                      />
                    </ActionPanel.Section>
                  </ActionPanel>
                }
              />
            ))}
          </List.Section>
        );
      })}
    </List>
  );
}
