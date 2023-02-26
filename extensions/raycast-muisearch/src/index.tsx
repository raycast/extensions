import { Action, ActionPanel, List } from "@raycast/api";
import algoliasearch from "algoliasearch";
import { useEffect, useState } from "react";
import { Hit } from "./algolia.types";

const client = algoliasearch("TZGZ85B9TB", "8177dfb3e2be72b241ffb8c5abafa899");

const index = client.initIndex("material-ui");

/**
 * This command searches the MUI docs and returns the results using algoliasearch
 * Credentials are from @mui documentation.
 * @returns
 */
export default function Command() {
  const [searchText, setSearchText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [data, setData] = useState<SearchResult[]>([]);
  useEffect(() => {
    setIsLoading(true);
    if (searchText.length > 0) {
      index.search(searchText).then(({ hits }) => {
        const data = hits as Hit[];
        const parsedData = data.map((hit) => ({
          name: hit.hierarchy.lvl0?.replaceAll("amp;", ""),
          description: hit.hierarchy.lvl1?.replaceAll("amp;", ""),
          username: hit.hierarchy.lvl2?.replaceAll("amp;", ""),
          url: hit.url,
        })) as SearchResult[];
        setData(parsedData);
      });
    }
  }, [searchText]);
  return (
    <List isLoading={isLoading} onSearchTextChange={setSearchText} searchBarPlaceholder="Search @mui docs.." throttle>
      <List.Section title="Results" subtitle={data?.length + ""}>
        {data?.map((searchResult) => (
          <SearchListItem key={searchResult.url} searchResult={searchResult} />
        ))}
      </List.Section>
    </List>
  );
}

function SearchListItem({ searchResult }: { searchResult: SearchResult }) {
  return (
    <List.Item
      title={searchResult.name}
      subtitle={searchResult.description}
      accessoryTitle={searchResult.username}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <Action.OpenInBrowser title="Open in Browser" url={searchResult.url} />
          </ActionPanel.Section>
          <ActionPanel.Section>
            <Action.CopyToClipboard
              title="Copy Install Command"
              content={`npm install ${searchResult.name}`}
              shortcut={{ modifiers: ["cmd"], key: "." }}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}
interface SearchResult {
  name: string;
  description?: string;
  username?: string;
  url: string;
}
