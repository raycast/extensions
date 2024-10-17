import { ActionPanel, Action, List, showToast, Toast } from "@raycast/api";
import { useSearch } from "./utils/useSearch";
import { getIcon } from "./utils/resultUtils";
import { SearchResult } from "./utils/types";

export default function Command() {
  const { isLoading, results, searchText, search, history, addHistory } = useSearch();

  const handleSubmit = (query: string) => {
    if (!query.trim()) return;

    const url = `https://stocks.apple.com/symbol/${query}`;
    const newResult: SearchResult = {
      id: query,
      query,
      description: `Ticker: ${query}`,
      url,
    };

    addHistory(newResult);
    showToast(Toast.Style.Success, "Opening in Stocks", newResult.description);
  };

  return (
    <List
      isLoading={isLoading}
      onSearchTextChange={search}
      searchBarPlaceholder="Search for a stock ticker..."
      throttle
    >
      <List.Section title="Search Results" subtitle={`${results.length}`}>
        {results.map((result) => (
          <SearchListItem key={result.id} searchResult={result} onSubmit={handleSubmit} />
        ))}
      </List.Section>
      {searchText && results.length === 0 && (
        <List.Item
          title={`Search for "${searchText}"`}
          icon={getIcon({
            id: searchText,
            query: searchText,
            url: `https://stocks.apple.com/symbol/${searchText}`,
            description: `Ticker: ${searchText}`,
          })}
          actions={
            <ActionPanel>
              <Action.OpenInBrowser
                title="Open in Stocks"
                url={`https://stocks.apple.com/symbol/${searchText}`}
                onOpen={() => handleSubmit(searchText)}
              />
            </ActionPanel>
          }
        />
      )}
      {history.length > 0 && (
        <List.Section title="Search History" subtitle={`${history.length}`}>
          {history.map((item) => (
            <List.Item
              key={item.id}
              title={item.query}
              icon={getIcon(item)}
              actions={
                <ActionPanel>
                  <Action.OpenInBrowser title="Open in Stocks" url={item.url} />
                  <Action.CopyToClipboard title="Copy URL" content={item.url} />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      )}
    </List>
  );
}

function SearchListItem({ searchResult, onSubmit }: { searchResult: SearchResult; onSubmit: (query: string) => void }) {
  return (
    <List.Item
      title={searchResult.query}
      subtitle={searchResult.description}
      icon={getIcon(searchResult)}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <Action.OpenInBrowser
              title="Open in Stocks"
              url={searchResult.url}
              onOpen={() => onSubmit(searchResult.query)}
            />
          </ActionPanel.Section>
          <ActionPanel.Section>
            <Action.CopyToClipboard title="Copy URL" content={searchResult.url} />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}
