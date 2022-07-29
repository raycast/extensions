import { Action, ActionPanel, List } from "@raycast/api";
import { useCallback, useMemo, useState } from "react";
import { capitalizeRecursively, getIcon, makeUrl, makeUrlMarkdown } from "./utils";
import { config } from "./config";
import { useFetch } from "@raycast/utils";

export default function Command() {
  const [searchText, setSearchText] = useState("");

  const params = new URLSearchParams();
  params.append("q", searchText.length === 0 ? "SwiftUI" : searchText);
  params.append("results", config.maxResults.toString());

  const { data, isLoading } = useFetch(config.apiBaseUrl + "?" + params.toString(), {
    parseResponse: async (response) => (await response.json()) as PayloadResponse,
    keepPreviousData: true,
    initialData: { results: [], featuredResult: "", suggested_query: "", uuid: "" },
  });

  const resultsTitle = useMemo(() => {
    const { suggested_query } = data;
    if (typeof suggested_query === "string") {
      return "Results";
    }

    return `Results for "${suggested_query.query}"`;
  }, [data.suggested_query]);

  const [typeFilter, setTypeFilter] = useState<AllResultType | ResultType>("all");
  const onTypeChange = useCallback((type: string) => {
    setTypeFilter(type);
  }, []);
  const results = useMemo(() => {
    const { results } = data;
    switch (typeFilter.toLowerCase()) {
      case "general":
      case "documentation":
      case "sample_code":
      case "video":
        return results.filter((result) => result.type === typeFilter);
      default:
        return results;
    }
  }, [data.results, typeFilter]);

  return (
    <List
      isLoading={isLoading}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search Apple Developer documentation..."
      searchBarAccessory={
        <TypeDropdown types={["all", "general", "documentation", "sample_code", "video"]} onTypeChange={onTypeChange} />
      }
      throttle
    >
      {typeof data.featuredResult !== "string" && (
        <List.Section title="Featured">
          <SearchFeaturedItem featured={data.featuredResult} />
        </List.Section>
      )}
      <List.Section title={resultsTitle} subtitle={results.length + ""}>
        {results.map((result) => (
          <SearchListItem key={`${result.order}_${result.url}`} result={result} />
        ))}
      </List.Section>
    </List>
  );
}

function ItemActionPanel({ url, title }: { url: string; title?: string }) {
  return (
    <ActionPanel>
      <ActionPanel.Section>
        <Action.OpenInBrowser title="Open in Browser" url={url} />
      </ActionPanel.Section>
      <ActionPanel.Section>
        <Action.CopyToClipboard title="Copy URL" content={url} shortcut={{ modifiers: ["cmd"], key: "." }} />
        <Action.CopyToClipboard
          title="Copy URL in Markdown"
          content={makeUrlMarkdown(url, title)}
          shortcut={{ modifiers: ["cmd", "shift"], key: "." }}
        />
      </ActionPanel.Section>
    </ActionPanel>
  );
}

function SearchFeaturedItem({ featured }: { featured: FeaturedResult }) {
  const url = useMemo(() => makeUrl(featured.url), [featured.url]);

  return (
    <List.Item
      title={featured.title}
      icon={makeUrl(featured.icon)}
      subtitle={featured.description}
      actions={<ItemActionPanel url={url} title={featured.title} />}
    />
  );
}

function SearchListItem({ result }: { result: SearchResult }) {
  const icon = useMemo(() => getIcon(result.type), [result.type]);
  const url = useMemo(() => makeUrl(result.url), [result.url]);

  return (
    <List.Item
      title={result.title}
      icon={icon}
      subtitle={result.description}
      accessories={[{ text: result.platform.join(", "), icon: result.tile_image }]}
      actions={<ItemActionPanel url={url} title={result.title} />}
    />
  );
}

type TypeDropdownProps = {
  types: (AllResultType | ResultType)[];
  onTypeChange: (type: AllResultType | ResultType) => void;
};
function TypeDropdown({ types, onTypeChange }: TypeDropdownProps) {
  return (
    <List.Dropdown tooltip="Select result type" storeValue={true} onChange={onTypeChange}>
      <List.Dropdown.Section title="Result Types">
        {types.map((resultType) => (
          <List.Dropdown.Item
            icon={getIcon(resultType)}
            key={resultType}
            title={capitalizeRecursively(resultType.replace("_", " ").toLowerCase())}
            value={resultType}
          />
        ))}
      </List.Dropdown.Section>
    </List.Dropdown>
  );
}
