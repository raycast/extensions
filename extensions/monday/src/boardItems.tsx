import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { getBoardItemsPage } from "./lib/api";
import { ErrorView } from "./lib/helpers";

export default function BoardItems({ boardId }: { boardId: number }) {
  const {
    isLoading,
    data: items = [],
    error,
  } = usePromise(async () => await getBoardItemsPage(boardId), []);

  return error ? (
    <ErrorView error={error} />
  ) : (
    <List isLoading={isLoading}>
      {items.map((item) => (
        <List.Item
          key={item.id}
          icon={Icon.Circle}
          title={item.name}
          subtitle={item.group.title}
          accessories={[{ tag: item.state }]}
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
