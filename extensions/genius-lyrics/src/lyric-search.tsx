import { useState } from "react";
import { List, LaunchProps, Action, ActionPanel } from "@raycast/api";
import { useFetch } from "@raycast/utils";

const GENIUS_SEARCH_URL = "https://genius.com/api/search/lyrics?q=";

interface SearchResults {
  id: number;
  title: string;
  url: string;
  header_image_url: string;
  primary_artist: {
    name: string;
  };
}

interface SearchHit {
  result: SearchResults;
  highlights: {
    value: string;
  }[];
}

interface SearchSections {
  hits: SearchHit[];
}

interface SearchResponse {
  sections: SearchSections[];
}

interface SearchData {
  response: SearchResponse;
}

export default function Command(props: LaunchProps<{ arguments: { query: string } }>) {
  const [searchQuery, setSearchQuery] = useState(props.arguments.query || "");

  const { data, isLoading } = useFetch<SearchData>(`${GENIUS_SEARCH_URL}${encodeURIComponent(searchQuery)}`);

  const results = (data?.response?.sections?.[0]?.hits as SearchHit[]) || [];

  return (
    <List isLoading={isLoading} onSearchTextChange={setSearchQuery} searchBarPlaceholder="Enter lyrics...">
      {results.map((hit: SearchHit) => (
        <List.Item
          key={hit.result.id}
          title={`${hit.result.title} by ${hit.result.primary_artist.name}`}
          subtitle={`${hit.highlights[0].value.replace("\n", " ")}`}
          icon={hit.result.header_image_url}
          actions={
            <ActionPanel title="Actions">
              <Action.OpenInBrowser url={hit.result.url} />
              <Action.CopyToClipboard
                title="Copy Song and Artist to Clipboard"
                content={`${hit.result.title} by ${hit.result.primary_artist.name}`}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
