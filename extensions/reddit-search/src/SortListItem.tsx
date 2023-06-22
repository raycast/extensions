import { List, ActionPanel, Action, Icon } from "@raycast/api";
import Sort from "./Sort";

export default function SortListItem({
  sort,
  currentSort,
  doSearch,
}: {
  sort: Sort;
  currentSort: Sort;
  doSearch: (sort: Sort, after?: string) => void;
}) {
  return (
    <List.Item
      key={sort.sortValue}
      icon={Icon.MagnifyingGlass}
      title={`Sort by ${sort.name}`}
      accessoryTitle={currentSort.sortValue === sort.sortValue ? "Sorting by" : ""}
      actions={
        <ActionPanel>
          <Action title={`Sort by ${sort.name}`} onAction={() => doSearch(sort)} />
        </ActionPanel>
      }
    />
  );
}
