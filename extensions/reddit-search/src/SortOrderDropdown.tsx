import { useState } from "react";
import { List } from "@raycast/api";
import redditSort from "./RedditSort";
import Sort from "./Sort";

export default function SortOrderDropdown({
  defaultSort,
  onSortChange,
}: {
  defaultSort: Sort;
  onSortChange: (sort: Sort) => void;
}) {
  const [selectedSort, setSelectedSort] = useState(defaultSort);

  return (
    <List.Dropdown
      tooltip="Select Sort Order"
      value={selectedSort.sortValue}
      onChange={(newValue) => {
        const newSort = redditSort.getSortFromValue(newValue);
        setSelectedSort(newSort);
        onSortChange(newSort);
      }}
    >
      <List.Dropdown.Item title={`Sorting by ${redditSort.relevance.name}`} value={redditSort.relevance.sortValue} />
      <List.Dropdown.Item title={`Sorting by ${redditSort.hot.name}`} value={redditSort.hot.sortValue} />
      <List.Dropdown.Item title={`Sorting by ${redditSort.top.name}`} value={redditSort.top.sortValue} />
      <List.Dropdown.Item title={`Sorting by ${redditSort.latest.name}`} value={redditSort.latest.sortValue} />
      <List.Dropdown.Item title={`Sorting by ${redditSort.comments.name}`} value={redditSort.comments.sortValue} />
    </List.Dropdown>
  );
}
