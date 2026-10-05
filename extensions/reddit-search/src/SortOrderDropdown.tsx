import { List } from "@raycast/api";
import redditSort from "./RedditSort";
import Sort from "./Sort";

/**
 * Sort order selector.
 *
 * Value is **controlled by the parent's persisted sort**, so the label always
 * reflects the sort actually in effect (a stale local copy once let the label
 * claim "Top" while showing relevance-ordered results). Selecting a sort always
 * commits — the parent decides whether to re-fetch now (a live query) or just arm
 * it for the next search (rate limited, or nothing searched yet).
 */
export default function SortOrderDropdown({ sort, onSortChange }: { sort: Sort; onSortChange: (sort: Sort) => void }) {
  return (
    <List.Dropdown
      tooltip="Select Sort Order"
      value={sort.sortValue}
      onChange={(newValue) => {
        const newSort = redditSort.getSortFromValue(newValue);
        if (newSort && newSort.sortValue !== sort.sortValue) {
          onSortChange(newSort);
        }
      }}
    >
      {redditSort.allSortOrders.map((sortOrder) => (
        <List.Dropdown.Item
          key={sortOrder.sortValue}
          title={sortOrder.name}
          icon={sortOrder.icon}
          value={sortOrder.sortValue}
        />
      ))}
    </List.Dropdown>
  );
}
