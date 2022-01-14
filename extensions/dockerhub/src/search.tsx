import { ActionPanel, CopyToClipboardAction, List, OpenInBrowserAction, showToast, ToastStyle } from "@raycast/api";
import { search, SearchType } from "./lib/api";
import { useEffect, useState } from "react";
import { SearchResult, SearchSummary } from "./lib/type";

interface Props {
  searchType: SearchType;
  text?: string;
}

export function Search(props: Props) {
  const [searchResult, setSearchResult] = useState<SearchResult>({
    count: 0,
    page: 0,
    page_size: 0,
    next: "",
    previous: "",
    summaries: [],
  });
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    (async () => {
      await onSearchTextChange(props.text ? props.text : "");
      setLoading(false);
    })();
  }, []);

  const onSearchTextChange = async (text: string) => {
    setLoading(true);
    try {
      const result: SearchResult = await search({ q: text, type: props.searchType, page_size: 25 });
      setSearchResult(result);
    } catch (err) {
      showToast(ToastStyle.Failure, "Search failed", (err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <List isLoading={loading} onSearchTextChange={onSearchTextChange} throttle>
      {searchResult.summaries
        ? searchResult.summaries.map((item: SearchSummary, index: number) => (
            <List.Item
              key={index}
              title={`[${item.from}] ${item.name}`}
              subtitle={item.short_description}
              accessoryTitle={`${item.pull_count} Downloads`}
              accessoryIcon={item.logo_url.small}
              actions={
                <ActionPanel>
                  <OpenInBrowserAction url={item.url ? item.url : ""} />
                  <CopyToClipboardAction title="Copy URL" content={item.url ? item.url : ""} />
                </ActionPanel>
              }
            />
          ))
        : null}
    </List>
  );
}
