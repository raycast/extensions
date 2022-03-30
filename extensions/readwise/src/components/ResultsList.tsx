import React, { ComponentType } from "react";
import { List } from "@raycast/api";
import { getListSubtitle } from "../utils";

type ResultItem = { id: number };
type ListProps<T extends ResultItem> = { item: T };

interface IResultsListProps<T extends ResultItem, K extends ListProps<T>> {
  data:
    | {
        results: T[];
      }
    | undefined;
  loading: boolean;
  listView: ComponentType<K>;
}

export const ResultsList = <T extends ResultItem, K extends ListProps<T>>({
  data,
  loading,
  listView: ListView,
}: IResultsListProps<T, K>) => {
  const totalCount = data?.results.length || 0;
  const listSubtitle = getListSubtitle(loading, totalCount);

  return (
    <List.Section title="Results" subtitle={listSubtitle}>
      {!loading && !data?.results.length && <List.EmptyView title="Nothing found." />}

      {data?.results.map((result) => {
        // @ts-expect-error ts(2322): 'K' could be instantiated with a different subtype of constraint 'ListProps<T>'
        return <ListView key={result.id} item={result} />;
      })}
    </List.Section>
  );
};
