import { useState, useEffect } from "react";
import { List, showToast, Toast, Action, ActionPanel } from "@raycast/api";
import axios from "axios";

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

async function fetchGeniusSearch(query: string) {
  try {
    const response = await axios.get(`${GENIUS_SEARCH_URL}${encodeURIComponent(query)}`);
    const data: SearchData = response.data;

    const hits = data.response.sections[0].hits as SearchHit[];

    return hits;
  } catch (error) {
    console.error("Error searching lyrics:", error);
    showToast(Toast.Style.Failure, "Failed to fetch data from Genius");
    throw error;
  }
}

export default function Command() {
  const [searchQuery, setSearchQuery] = useState("");
  const [results, setResults] = useState<SearchHit[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const fetchResults = async () => {
      if (searchQuery) {
        setIsLoading(true);
        const searchHits: SearchHit[] = await fetchGeniusSearch(searchQuery);
        setResults(searchHits);
        setIsLoading(false);
      } else {
        setResults([]);
      }
    };

    fetchResults();
  }, [searchQuery]);

  return (
    <List isLoading={isLoading} onSearchTextChange={setSearchQuery} searchBarPlaceholder="Enter lyrics...">
      {results.map((hit: SearchHit) => (
        <List.Item
          key={hit.result.id}
          title={hit.result.title}
          subtitle={`${hit.result.primary_artist.name} - ${hit.highlights[0].value.replace("\n", " ")}`}
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
