import { Action, ActionPanel, List } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { NodeHtmlMarkdown } from "node-html-markdown";
import { useState } from "react";

const ALGOLIA_ID = "6RCFK5TOI5";
const KEY = "521c444a09acd62368618fce7f15dafa";

type IndexType = {
  id: string;
  name: string;
};

const searchIndicesChoices: IndexType[] = [
  { id: "all", name: "All" },
  { id: "G4_HELP", name: "Help" },
  { id: "G4_HUGO", name: "Developer docs" },
  { id: "G4_TUTORIALS", name: "Tutorials" },
  { id: "G4_CHANGELOG", name: "Changelog" },
  { id: "G4_RESOURCES", name: "Publisher resources" },
];

function configureSearchIndex(indexType: string, searchText: string): { indexName: string; params: string }[] {
  if (indexType === "all") {
    return [
      { indexName: "G4_HELP", params: `query=${searchText}&hitsPerPage=5` },
      { indexName: "G4_HUGO", params: `query=${searchText}&hitsPerPage=5` },
      { indexName: "G4_TUTORIALS", params: `query=${searchText}&hitsPerPage=5` },
      { indexName: "G4_GHOST", params: `query=${searchText}&hitsPerPage=5` },
      { indexName: "G4_RESOURCES", params: `query=${searchText}&hitsPerPage=5` },
    ];
  }

  return [{ indexName: indexType, params: `query=${searchText}&hitsPerPage=5` }];
}

function IndexDropdown({
  onIndicesChange,
  indexTypes,
}: {
  onIndicesChange: (newValue: string) => void;
  indexTypes: IndexType[];
}) {
  return (
    <List.Dropdown
      tooltip="Select an index to search"
      storeValue={true}
      onChange={(newValue) => onIndicesChange(newValue)}
    >
      {indexTypes.map((indexType) => (
        <List.Dropdown.Item key={indexType.id} title={indexType.name} value={indexType.id} />
      ))}
    </List.Dropdown>
  );
}

export default function Command() {
  const [searchText, setSearchText] = useState("");
  const [dropdownValue, setDropdownValue] = useState("");
  const indices = configureSearchIndex(dropdownValue, searchText);

  const onIndicesChange = (newValue: string) => {
    setDropdownValue(newValue);
  };

  const { data, isLoading } = useFetch(`https://${ALGOLIA_ID}-dsn.algolia.net/1/indexes/*/queries`, {
    headers: {
      "X-Algolia-Application-Id": ALGOLIA_ID,
      "X-Algolia-API-Key": KEY,
    },
    method: "POST",
    body: JSON.stringify({
      requests: indices,
      strategy: "none",
    }),
    parseResponse: parseFetchResponse,
  });

  return (
    <List
      isLoading={isLoading}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search Ghost docs..."
      throttle={true}
      filtering={false}
      isShowingDetail
      searchBarAccessory={
        <IndexDropdown onIndicesChange={onIndicesChange} indexTypes={searchIndicesChoices}></IndexDropdown>
      }
    >
      {data?.map((searchResult, index) => <SearchListSection searchResult={searchResult} key={index} />)}
    </List>
  );
}

function SearchListSection({ searchResult }: { searchResult: { [key: string]: SearchResult[] } }) {
  const key = Object.keys(searchResult)[0];

  return (
    <List.Section title={key} key={key}>
      {searchResult[key]?.map((hit: SearchResult) => {
        return <SearchListItem hit={hit} key={hit.objectID} />;
      })}
    </List.Section>
  );
}

function SearchListItem({ hit }: { hit: SearchResult }) {
  const md = NodeHtmlMarkdown.translate(hit.html);

  return (
    <List.Item
      title={hit.title}
      detail={<List.Item.Detail markdown={md} />}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <Action.OpenInBrowser title="Open in Browser" url={hit.url} />
            <Action.CopyToClipboard
              title="Copy URL"
              content={`${hit.url}`}
              shortcut={{ modifiers: ["cmd"], key: "." }}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}

const parseIndexName = (index: string) => {
  switch (index) {
    case "G4_GHOST":
      return "Changelog";
    case "G4_RESOURCES":
      return "Publisher resources";
    case "G4_HUGO":
      return "Developer docs";
    case "G4_HELP":
      return "Help";
    case "G4_TUTORIALS":
      return "Developer tutorials";
    default:
      return "Ghost";
  }
};

type SearchIndex = {
  hits: Hit[];
  nbHits: number;
  page: number;
  nbPages: number;
  hitsPerPage: number;
  exhaustiveNbHits: boolean;
  exhaustive: {
    nbHits: boolean;
    typo: boolean;
  };
  query: string;
  params: string;
  index: string;
  processingTimeMS: number;
  processingTimingsMS: {
    _request: object;
    afterFetch: object;
    getIdx: object;
    total: number;
  };
};

type Hit = {
  slug: string;
  url: string;
  html: string;
  image: string;
  title: string;
  tags: { name: string; slug: string }[];
  authors: string[];
  headings: string[];
  anchor: string;
  customRanking: object;
  objectID: string;
  _highlightResult: object;
};

type SearchResult = Pick<Hit, "url" | "html" | "image" | "title" | "tags" | "objectID"> & { index: string };

/** Parse the response from the fetch query into something we can display */
async function parseFetchResponse(response: Response) {
  const json = await response.json();

  if (!response.ok) {
    throw new Error("message" in json ? json.message : response.statusText);
  }

  const results: SearchIndex[] = json.results;

  const searchResults = results.map((eachIndex) => {
    const { index } = eachIndex;

    const hits = eachIndex.hits.map((hit) => {
      const { url, html, image, title, tags, objectID } = hit;
      return {
        url,
        html,
        image,
        title,
        tags,
        index,
        objectID,
      } as SearchResult;
    });

    return { [parseIndexName(index)]: [...hits] } as { [key: string]: SearchResult[] };
  });

  return searchResults;
}
