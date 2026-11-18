import { Action, ActionPanel, Icon, List } from "@raycast/api";

export const LOAD_MORE_ITEM_ID = "load-more";

type LoadMoreListItemProps = {
  isLoading: boolean;
  onLoadMore: () => void;
};

export function LoadMoreListItem({
  isLoading,
  onLoadMore,
}: LoadMoreListItemProps) {
  return (
    <List.Item
      id={LOAD_MORE_ITEM_ID}
      title={isLoading ? "Loading More..." : "Load More"}
      icon={isLoading ? Icon.Clock : Icon.ArrowDown}
      actions={
        <ActionPanel>
          <Action
            title={isLoading ? "Loading More…" : "Load More"}
            icon={Icon.ArrowDown}
            onAction={onLoadMore}
          />
        </ActionPanel>
      }
    />
  );
}
