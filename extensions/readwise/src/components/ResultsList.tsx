import { ComponentType, ReactNode } from "react";
import { List } from "@raycast/api";
import { getListSubtitle } from "../utils";

/**
 * Raycast provides a default EmptyView that will be displayed if the List
 * component either has no children, or if it has children, but none of them
 * match the query in the search bar.
 *
 * Note that the EmptyView is never displayed if the List’s isLoading.
 */
export const ListWithEmptyView = () => <List.EmptyView title="No Results" icon={{ source: "empty-view.png" }} />;

type ResultItem = { id: number };
type ListProps<T extends ResultItem> = { item: T };

interface IResultsListProps<T extends ResultItem, K extends ListProps<T>> {
  actions: ReactNode;
  data:
    | {
        results: T[];
      }
    | undefined;
  loading: boolean;
  listView: ComponentType<K>;
}

export const ResultsList = <T extends ResultItem, K extends ListProps<T>>({
  actions,
  data,
  loading,
  listView: ListView,
}: IResultsListProps<T, K>) => {
  const totalCount = data?.results.length || 0;
  const listSubtitle = getListSubtitle(loading, totalCount);

  return (
    <>
      <ListWithEmptyView />

      <List.Section title="Results" subtitle={listSubtitle}>
        {data?.results.map((result) => {
          // @ts-expect-error ts(2322): 'K' could be instantiated with a different subtype of constraint 'ListProps<T>'
          return <ListView key={result.id} item={result} actions={actions} />;
        })}
      </List.Section>
    </>
  );
};
