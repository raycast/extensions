import {
  ActionPanel,
  Action,
  Color,
  getPreferenceValues,
  List,
  Icon,
  Keyboard,
  Form,
  useNavigation,
  showToast,
  Toast,
} from "@raycast/api";
import { useState, useEffect } from "react";
import { URL } from "node:url";
import { useFetch, showFailureToast } from "@raycast/utils";

interface NixOSChannel {
  channel: string;
  name: string;
  revision: string;
  release: string;
}

interface VersionInfo {
  nixos_search: {
    frontend_version: string;
    channel_version: string;
  };
  nixos_channels: NixOSChannel[];
  last_updated: string;
}

export default function Command() {
  const { searchSize = "20" } = getPreferenceValues<Preferences>();
  const [currentSearchSize, setCurrentSearchSize] = useState<number>(
    Math.max(1, Math.min(200, Math.trunc(+searchSize) || 20)),
  );

  const [selectedBranch, setSelectedBranch] = useState<string>("unstable");
  const [availableBranches, setAvailableBranches] = useState<Array<{ value: string; title: string }>>([
    { value: "unstable", title: "Unstable (rolling release)" },
  ]);

  // Fetch available branches from API
  useEffect(() => {
    async function fetchBranches() {
      try {
        const resp = await fetch(
          "https://raw.githubusercontent.com/0xdhrv/nix-version-reporter/refs/heads/main/versions.json",
        );
        if (!resp.ok) throw new Error("Failed to fetch version info");

        const versionInfo = (await resp.json()) as VersionInfo;
        const branches = [
          { value: "unstable", title: "Unstable (rolling release)" },
          ...versionInfo.nixos_channels.map((channel) => ({
            value: channel.channel,
            title: `NixOS ${channel.channel}`,
          })),
        ];

        setAvailableBranches(branches);
      } catch (error) {
        console.error("Failed to fetch branches:", error);
        // Keep default branches if fetch fails
      }
    }

    fetchBranches();
  }, []);

  const [url, setUrl] = useState<string | undefined>(undefined);
  if (!url) {
    getSearchUrl({ branchName: selectedBranch })
      .then(setUrl)
      .catch((error) => showFailureToast(error, { title: "Could not get search URL" }));
  }

  // Update URL when branch changes
  useEffect(() => {
    getSearchUrl({ branchName: selectedBranch })
      .then(setUrl)
      .catch((error) => showFailureToast(error, { title: "Could not get search URL" }));
  }, [selectedBranch]);

  const [searchText, setSearchText] = useState("");
  const state = useSearch({ url, searchText, searchSize: currentSearchSize });

  return (
    <List
      isLoading={state.isLoading}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search nix packages..."
      throttle
      isShowingDetail
      searchBarAccessory={
        <List.Dropdown tooltip="Select NixOS Branch" value={selectedBranch} onChange={setSelectedBranch}>
          {availableBranches.map((branch) => (
            <List.Dropdown.Item key={branch.value} value={branch.value} title={branch.title} />
          ))}
        </List.Dropdown>
      }
    >
      {state.results.length === 0 ? (
        <List.EmptyView
          icon={Icon.MagnifyingGlass}
          title={searchText ? "No packages found" : "Search NixOS Packages"}
          description={searchText ? "Try a different search term" : "Start typing to search for packages"}
          actions={
            <ActionPanel>
              <ActionPanel.Section title="Settings">
                <Action.Push
                  title="Customize Search Result Count"
                  icon={Icon.Gear}
                  target={<SearchSizeForm currentSize={currentSearchSize} onSubmit={setCurrentSearchSize} />}
                  shortcut={{ modifiers: ["cmd"], key: "," }}
                />
              </ActionPanel.Section>
            </ActionPanel>
          }
        />
      ) : (
        <List.Section title="Results" subtitle={state.results.length + ""}>
          {state.results.map((searchResult) => (
            <SearchListItem
              key={searchResult.id}
              searchResult={searchResult}
              searchSize={currentSearchSize}
              onChangeSearchSize={setCurrentSearchSize}
            />
          ))}
        </List.Section>
      )}
    </List>
  );
}

function SearchListItem({
  searchResult,
  searchSize,
  onChangeSearchSize,
}: {
  searchResult: SearchResult;
  searchSize: number;
  onChangeSearchSize: (size: number) => void;
}) {
  return (
    <List.Item
      title={searchResult.attrName}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <Action.CopyToClipboard title="Copy Package Attr Name" content={searchResult.attrName} />
          </ActionPanel.Section>
          <ActionPanel.Section title="Settings">
            <Action.Push
              title="Customize Search Result Count"
              icon={Icon.Gear}
              target={<SearchSizeForm currentSize={searchSize} onSubmit={onChangeSearchSize} />}
              shortcut={{ modifiers: ["cmd"], key: "," }}
            />
          </ActionPanel.Section>
          <ActionPanel.Section>
            {searchResult.homepage[0] ? (
              <>
                <Action.OpenInBrowser
                  title="Open Package Homepage"
                  url={searchResult.homepage[0]}
                  shortcut={Keyboard.Shortcut.Common.Open}
                />
                <Action.CopyToClipboard
                  title="Copy Package Homepage URL"
                  content={searchResult.homepage[0]}
                  shortcut={Keyboard.Shortcut.Common.Copy}
                />
              </>
            ) : null}
            {searchResult.source && (
              <>
                <Action.OpenInBrowser
                  title="Open Package Source Code"
                  url={searchResult.source!}
                  shortcut={{
                    macOS: { modifiers: ["cmd", "shift"], key: "o" },
                    Windows: { modifiers: ["ctrl", "shift"], key: "o" },
                  }}
                />
                <Action.CopyToClipboard
                  title="Copy Package Source URL"
                  content={searchResult.source!}
                  shortcut={{
                    macOS: { modifiers: ["cmd", "shift"], key: "c" },
                    Windows: { modifiers: ["ctrl", "shift"], key: "c" },
                  }}
                />
              </>
            )}
          </ActionPanel.Section>
        </ActionPanel>
      }
      detail={
        <List.Item.Detail
          markdown={`# ${searchResult.attrName}\n${searchResult.description ?? ""}`}
          metadata={
            <List.Item.Detail.Metadata>
              <List.Item.Detail.Metadata.Label title="Name" text={searchResult.name} />
              <List.Item.Detail.Metadata.Label title="Version" text={searchResult.version} />
              {searchResult.homepage.map((url, idx) =>
                url ? (
                  <List.Item.Detail.Metadata.Link key={url} title="Homepage" target={url} text={new URL(url).host} />
                ) : (
                  <List.Item.Detail.Metadata.Label key={idx} title="Homepage" icon={Icon.Minus} />
                ),
              )}
              {searchResult.source && (
                <List.Item.Detail.Metadata.Link
                  title="Source"
                  target={searchResult.source!}
                  text={new URL(searchResult.source!).host}
                />
              )}
              {searchResult.licenses.map((license) =>
                license.url ? (
                  <List.Item.Detail.Metadata.Link
                    key={license.url}
                    title="License"
                    target={license.url}
                    text={license.name}
                  />
                ) : (
                  <List.Item.Detail.Metadata.Label key={license.name} title="License" text={license.name} />
                ),
              )}
              <List.Item.Detail.Metadata.TagList title="Outputs">
                {searchResult.outputs.map((text) => (
                  <List.Item.Detail.Metadata.TagList.Item
                    key={text}
                    text={text}
                    color={text === searchResult.defaultOutput ? Color.PrimaryText : Color.SecondaryText}
                  />
                ))}
              </List.Item.Detail.Metadata.TagList>
              <List.Item.Detail.Metadata.TagList title="Platforms">
                {searchResult.platforms.map((text) => (
                  <List.Item.Detail.Metadata.TagList.Item key={text} text={text} />
                ))}
              </List.Item.Detail.Metadata.TagList>
            </List.Item.Detail.Metadata>
          }
        />
      }
    />
  );
}

function SearchSizeForm({ currentSize, onSubmit }: { currentSize: number; onSubmit: (size: number) => void }) {
  const { pop } = useNavigation();

  async function handleSubmit(values: { searchSize: string }) {
    const newSize = Math.max(1, Math.min(200, Math.trunc(+values.searchSize) || 20));
    onSubmit(newSize);

    await showToast({
      style: Toast.Style.Success,
      title: "Search Result Count Updated",
      message: `Now showing ${newSize} results`,
    });

    pop();
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Save Preference" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Description text="Customize the number of search results displayed at once" />
      <Form.Dropdown id="searchSize" title="Search Result Count" defaultValue={currentSize.toString()}>
        <Form.Dropdown.Item value="10" title="10 results" />
        <Form.Dropdown.Item value="20" title="20 results" />
        <Form.Dropdown.Item value="50" title="50 results" />
        <Form.Dropdown.Item value="100" title="100 results" />
      </Form.Dropdown>
    </Form>
  );
}

function useSearch({ url, searchText, searchSize }: { url?: string; searchText: string; searchSize: number }) {
  const queryFields = [
    "package_attr_name^9",
    "package_attr_name.edge^9",
    "package_pname^6",
    "package_pname.edge^6",
    "package_attr_name_query^4",
    "package_attr_name_query.edge^4",
    "package_description^1.3",
    "package_description.edge^1.3",
    "package_longDescription^1",
    "package_longDescription.edge^1",
    "flake_name^0.5",
    "flake_name.edge^0.5",
    "package_attr_name_reverse^7.2",
    "package_attr_name_reverse.edge^7.2",
    "package_pname_reverse^4.800000000000001",
    "package_pname_reverse.edge^4.800000000000001",
    "package_attr_name_query_reverse^3.2",
    "package_attr_name_query_reverse.edge^3.2",
    "package_description_reverse^1.04",
    "package_description_reverse.edge^1.04",
    "package_longDescription_reverse^0.8",
    "package_longDescription_reverse.edge^0.8",
    "flake_name_reverse^0.4",
    "flake_name_reverse.edge^0.4",
  ];
  const reversedSearchText = [...searchText].reverse().join("");

  const query = {
    size: searchSize,
    sort: [{ _score: "desc" }, { package_attr_name: "desc" }, { package_pversion: "desc" }],
    query: {
      bool: {
        filter: [{ term: { type: { value: "package", _name: "filter_packages" } } }],
        must: [
          {
            dis_max: {
              tie_breaker: 0.7,
              queries: [
                {
                  multi_match: {
                    type: "cross_fields",
                    query: searchText,
                    analyzer: "whitespace",
                    auto_generate_synonyms_phrase_query: false,
                    operator: "and",
                    _name: `multi_match_${searchText}`,
                    fields: queryFields,
                  },
                },
                {
                  multi_match: {
                    type: "cross_fields",
                    query: reversedSearchText,
                    analyzer: "whitespace",
                    auto_generate_synonyms_phrase_query: false,
                    operator: "and",
                    _name: `multi_match_${reversedSearchText}`,
                    fields: queryFields,
                  },
                },
                { wildcard: { package_attr_name: { value: `*${searchText}*` } } },
              ],
            },
          },
        ],
      },
    },
  };

  const { isLoading, data } = useFetch(url!, {
    method: "POST",
    headers: {
      Authorization: "Basic YVdWU0FMWHBadjpYOGdQSG56TDUyd0ZFZWt1eHNmUTljU2g=",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(query),
    async parseResponse(response) {
      const json = (await response.json()) as
        | {
            hits: {
              hits: {
                _id: string;
                _source: {
                  package_pname: string;
                  package_attr_name: string;
                  package_attr_set: string;
                  package_outputs: string[];
                  package_default_output: string | null;
                  package_description: string | null;
                  package_homepage: string[];
                  package_pversion: string;
                  package_platforms: string[];
                  package_position: string;
                  package_license: { fullName: string; url: string | null }[];
                };
              }[];
            };
          }
        | { error: { reason: string }; status: number }
        | { code: string; message: string };

      if ("code" in json) {
        throw new Error(json.message);
      } else if ("error" in json) {
        throw new Error(json.error.reason);
      } else if (!response.ok) {
        throw new Error(response.statusText);
      }

      return json.hits.hits.map(({ _source: result, _id: id }) => {
        return {
          id,
          name: result.package_pname,
          attrName: result.package_attr_name,
          description: result.package_description,
          version: result.package_pversion,
          homepage: result.package_homepage,
          source:
            result.package_position &&
            `https://github.com/NixOS/nixpkgs/blob/nixos-unstable/${result.package_position.replace(/:([0-9]+)$/, "")}`,
          outputs: result.package_outputs,
          defaultOutput: result.package_default_output,
          platforms: result.package_platforms.filter((platform) =>
            ["x86_64-linux", "aarch64-linux", "i686-linux", "x86_64-darwin", "aarch64-darwin"].includes(platform),
          ),
          licenses: result.package_license.map((license) => {
            let url: string | null;
            try {
              url = license.url ?? new URL(license.fullName).href;
            } catch {
              url = null;
            }
            return { name: license.fullName, url };
          }),
        };
      });
    },
    initialData: [],
    execute: Boolean(url) && searchText.length > 0,
    failureToastOptions: {
      title: "Could not perform search",
    },
  });
  return { isLoading, results: !searchText.length ? [] : data };
}

async function getSearchUrl({ branchName }: { branchName: string }) {
  const resp = await fetch("https://raw.githubusercontent.com/NixOS/nixos-search/main/version.nix");
  if (!resp.ok) throw new Error("Cannot access GitHub");

  const text = await resp.text();

  // extract frontend = "NN";
  const m = text.match(/frontend\s*=\s*"([^"]+)"\s*;/);
  if (!m) throw new Error("Cannot parse frontend version from version.nix");

  const frontend = m[1].trim();
  return `https://search.nixos.org/backend/latest-${frontend}-nixos-${branchName}/_search`;
}

interface SearchResult {
  id: string;
  name: string;
  attrName: string;
  description: string | null;
  version: string;
  homepage: string[];
  source: string | null;
  outputs: string[];
  defaultOutput: string | null;
  platforms: string[];
  licenses: { name: string; url: string | null }[];
}

interface Preferences {
  /** Number of search results to display (10, 20, 50, or 100) */
  searchSize: string;
}
