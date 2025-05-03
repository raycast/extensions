import { ActionPanel, Action, Color, getPreferenceValues, List, Icon } from "@raycast/api";
import { useState } from "react";
import { URL } from "node:url";
import { useFetch } from "@raycast/utils";

export default function Command() {
  const [searchText, setSearchText] = useState("");
  const state = useSearch(searchText);

  return (
    <List
      isLoading={state.isLoading}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search nix packages..."
      throttle
      isShowingDetail
    >
      <List.Section title="Results" subtitle={state.results.length + ""}>
        {state.results.map((searchResult) => (
          <SearchListItem key={searchResult.id} searchResult={searchResult} />
        ))}
      </List.Section>
    </List>
  );
}

function SearchListItem({ searchResult }: { searchResult: SearchResult }) {
  return (
    <List.Item
      title={searchResult.attrName}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <Action.CopyToClipboard title="Copy Package Attr Name" content={searchResult.attrName} />
          </ActionPanel.Section>
          <ActionPanel.Section>
            {searchResult.homepage[0] ? (
              <Action.OpenInBrowser
                title="Open Package Homepage"
                url={searchResult.homepage[0]}
                shortcut={{ modifiers: ["cmd"], key: "o" }}
              />
            ) : null}
            {searchResult.source && (
              <Action.OpenInBrowser
                title="Open Package Source Code"
                url={searchResult.source!}
                shortcut={{ modifiers: ["cmd"], key: "return" }}
              />
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
                )
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
                )
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

function useSearch(searchText: string) {
  const { searchSize, branchName } = getPreferenceValues<Preferences>();
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
    size: Math.trunc(+searchSize),
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

  const { isLoading, data } = useFetch(
    `https://nixos-search-7-1733963800.us-east-1.bonsaisearch.net/latest-42-nixos-${branchName}/_search`,
    {
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
              `https://github.com/NixOS/nixpkgs/blob/nixos-unstable/${result.package_position.replace(
                /:([0-9]+)$/,
                ""
              )}`,
            outputs: result.package_outputs,
            defaultOutput: result.package_default_output,
            platforms: result.package_platforms.filter((platform) =>
              ["x86_64-linux", "aarch64-linux", "i686-linux", "x86_64-darwin", "aarch64-darwin"].includes(platform)
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
      execute: searchText.length > 0,
      failureToastOptions: {
        title: "Could not perform search",
      },
    }
  );
  return { isLoading, results: !searchText.length ? [] : data };
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
