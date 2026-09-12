import { ActionPanel, Action, List, Icon } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { useState } from "react";

type SearchResult = {
  id: string;
  title: string;
  parts: string[];
  section: string;
  url: string;
};

type SearchSection = {
  title: string;
  results: SearchResult[];
};

const searchEndpoint = "https://deta.space/api/v0/indexes/docs/search";

export default function SearchDocs() {
  const [searchText, setSearchText] = useState("");
  const { data, isLoading } = useFetch(`${searchEndpoint}?q=${encodeURIComponent(searchText)}`, {
    parseResponse: parseFetchResponse,
    keepPreviousData: true,
  });

  return (
    <List isLoading={isLoading} onSearchTextChange={setSearchText} filtering={false} throttle>
      {data?.map((section) => (
        <List.Section key={section.title} title={section.title}>
          {section.results.map((searchResult) => (
            <SearchListItem key={searchResult.id} searchResult={searchResult} />
          ))}
        </List.Section>
      ))}
    </List>
  );
}

function SearchListItem({ searchResult }: { searchResult: SearchResult }) {
  return (
    <List.Item
      id={searchResult.id}
      title={searchResult.title}
      icon={Icon.BlankDocument}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <Action.OpenInBrowser title="Open in Browser" url={searchResult.url} />
          </ActionPanel.Section>
          <ActionPanel.Section>
            <Action.CopyToClipboard
              title="Copy Url"
              content={`${searchResult.url}`}
              shortcut={{ modifiers: ["cmd"], key: "." }}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}

type SearchHit = {
  objectID: string;

  hierarchy_lvl0: string;
  hierarchy_lvl1: string;
  hierarchy_lvl2: string;
  hierarchy_lvl3: string;
  hierarchy_lvl4: string;
  hierarchy_lvl5: string;
  hierarchy_lvl6: string;

  anchor: string;
  url: string;
};

type SearchResponse = {
  hits: SearchHit[];
  query: string;
};

async function parseFetchResponse(response: Response) {
  if (!response.ok) {
    throw new Error(`Failed to fetch search results: ${response.statusText}`);
  }
  const payload = (await response.json()) as SearchResponse;

  const sections: Record<string, SearchSection> = {};

  const seen = new Set<string>();
  for (const hit of payload.hits) {
    const parts = [];
    for (let i = 0; i < 7; i++) {
      if (!hit[`hierarchy_lvl${i}` as keyof SearchHit]) {
        break;
      }

      parts.push(hit[`hierarchy_lvl${i}` as keyof SearchHit]);
    }

    const sectionTitle = parts.slice(0, -1).join(" > ");
    if (!sections[sectionTitle]) {
      sections[sectionTitle] = {
        title: sectionTitle,
        results: [],
      };
    }

    const url = new URL(hit.url);
    url.protocol = "https:";
    url.host = "deta.space";
    url.port = "";

    // Normalize trailing slashes
    if (url.pathname.endsWith("/")) {
      url.pathname = url.pathname.slice(0, -1);
    }

    if (seen.has(url.toString())) {
      continue;
    }

    sections[sectionTitle].results.push({
      id: hit.objectID,
      section: sectionTitle,
      title: parts[parts.length - 1],
      parts: parts,
      url: url.toString(),
    });

    seen.add(url.toString());
  }

  return Object.values(sections);
}
