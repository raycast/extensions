# `useFrecencySorting`

Hook to sort an array by its frecency and provide methods to update the frecency of its items.

Frecency is a measure that combines frequency and recency. The more often an item is visited, and the more recently an item is visited, the higher it will rank.

## Signature

```ts
function useFrecencySorting<T>(
  data?: T[],
  options?: {
    namespace?: string;
    key?: (item: T) => string;
    sortUnvisited?: (a: T, b: T) => number;
  },
): {
  data: T[];
  visitItem: (item: T) => Promise<void>;
  resetRanking: (item: T) => Promise<void>;
};
```

### Arguments

- `data` is the array to sort

With a few options:

- `options.namespace` is a string that can be used to namespace the frecency data (if you have multiple arrays that you want to sort in the same extension).
- `options.key` is a function that should return a unique string for each item of the array to sort. By default, it will use `item.id`. If the items do not have an `id` field, this option is required.
- `options.sortUnvisited` is a function to sort the items that have never been visited. By default, the order of the input will be preserved.

### Return

Returns an object with the sorted array and some methods to update the frecency of the items.

- `data` is the sorted array. The order will be preserved for items that have never been visited
- `visitItem` is a method to use when an item is visited/used. It will increase its frecency.
- `resetRanking` is a method that can be used to reset the frecency of an item.

## Example

```tsx
import { List, ActionPanel, Action, Icon } from "@raycast/api";
import { useFetch, useFrecencySorting } from "@raycast/utils";

export default function Command() {
  const { isLoading, data } = useFetch("https://api.example");
  const { data: sortedData, visitItem, resetRanking } = useFrecencySorting(data);

  return (
    <List isLoading={isLoading}>
      {sortedData.map((item) => (
        <List.Item
          key={item.id}
          title={item.title}
          actions={
            <ActionPanel>
              <Action.OpenInBrowser url={item.url} onOpen={() => visitItem(item)} />
              <Action.CopyToClipboard title="Copy Link" content={item.url} onCopy={() => visitItem(item)} />
              <Action title="Reset Ranking" icon={Icon.ArrowCounterClockwise} onAction={() => resetRanking(item)} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
```
