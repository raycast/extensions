import { Action, ActionPanel, Detail, List } from "@raycast/api";

export function ListView(
  data: SearchResult[],
  isLoading: boolean,
  setSearchText: React.Dispatch<React.SetStateAction<string>>
) {
  if (isLoading) {
    return <Detail isLoading={isLoading} />;
  }

  return (
    <List
      isLoading={isLoading}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="请输入需要查询的中文..."
      throttle
    >
      <List.Section title="查询结果" subtitle={data?.length + ""}>
        {data?.map((searchResult) => (
          <SearchListItem key={searchResult.subtitle} searchResult={searchResult} />
        ))}
      </List.Section>
    </List>
  );
}

function SearchListItem({ searchResult }: { searchResult: SearchResult }) {
  return (
    <List.Item
      title={searchResult.title}
      subtitle={searchResult.subtitle}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <Action.CopyToClipboard
              title="Copy"
              content={`${searchResult.title}`}
              shortcut={{ modifiers: ["cmd"], key: "." }}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}
