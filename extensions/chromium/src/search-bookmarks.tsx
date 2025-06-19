import { ActionPanel, Action, List } from "@raycast/api";
import { getFavicon } from "@raycast/utils";
import { useBookmarkSearch } from "./hooks/useBookmarkSearch";

export default function Command() {
  const { data, isLoading } = useBookmarkSearch();

  return (
    <List isLoading={isLoading}>
      {data.map((item) => (
        <List.Item
          icon={getFavicon(item.url)}
          key={item.id}
          title={item.title}
          subtitle={item.url}
          actions={
            <ActionPanel>
              <Action.OpenInBrowser url={item.url} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
