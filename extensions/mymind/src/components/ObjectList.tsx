import { List } from "@raycast/api";
import { showFailureToast, useCachedPromise } from "@raycast/utils";
import { useMemo, useState } from "react";
import { listObjects } from "../api";
import { getObjectIcon, getObjectSubtitle, getObjectTypeLabel, getUserTagNames } from "../helpers";
import { buildObjectQuery, TypeFilter } from "../object-query";
import { ObjectActions } from "./ObjectActions";

const OBJECT_FETCH_LIMIT = 200;

export type ObjectListLoaderArgs = {
  query: string | undefined;
  searchText: string;
  typeFilter: TypeFilter;
};

export function ObjectList(props: {
  searchBarPlaceholder: string;
  emptyTitle: string;
  emptyDescription: string;
  initialType?: TypeFilter;
  loadObjects?: (args: ObjectListLoaderArgs) => Promise<ReturnType<typeof listObjects> extends Promise<infer T> ? T : never>;
  errorTitle?: string;
  errorEmptyView?: (error: unknown) => { title: string; description: string } | undefined;
}) {
  const [searchText, setSearchText] = useState("");
  const [selectedType, setSelectedType] = useState<TypeFilter>(props.initialType ?? "all");

  const {
    data: objects = [],
    isLoading,
    error,
    revalidate,
  } = useCachedPromise(
    async (query: string, typeFilter: TypeFilter) => {
      const builtQuery = buildObjectQuery(query, typeFilter);
      const loadObjects =
        props.loadObjects ??
        (async ({ query }: ObjectListLoaderArgs) =>
          await listObjects({
            q: query,
            limit: OBJECT_FETCH_LIMIT,
          }));

      return await loadObjects({
        query: builtQuery,
        searchText: query,
        typeFilter,
      });
    },
    [searchText, selectedType],
    {
      keepPreviousData: true,
      onError: (error) => {
        void showFailureToast(error, { title: props.errorTitle ?? "Couldn't load your mymind items" });
      },
    },
  );

  const filteredObjects = useMemo(() => objects.filter((item) => !item.deleted), [objects]);
  const errorEmptyView = error ? props.errorEmptyView?.(error) : undefined;

  return (
    <List
      filtering={false}
      isLoading={isLoading}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder={props.searchBarPlaceholder}
      throttle
      searchBarAccessory={
        <List.Dropdown
          tooltip="Filter Results"
          value={selectedType}
          onChange={(value) => setSelectedType(value as TypeFilter)}
        >
          <List.Dropdown.Section title="Type">
            <List.Dropdown.Item title="All Types" value="all" />
            <List.Dropdown.Item title="Images" value="image" />
            <List.Dropdown.Item title="Articles" value="article" />
            <List.Dropdown.Item title="Notes" value="note" />
            <List.Dropdown.Item title="Videos" value="video" />
            <List.Dropdown.Item title="PDFs" value="pdf" />
          </List.Dropdown.Section>
        </List.Dropdown>
      }
    >
      {filteredObjects.length === 0 ? (
        <List.EmptyView
          title={errorEmptyView?.title ?? props.emptyTitle}
          description={errorEmptyView?.description ?? props.emptyDescription}
        />
      ) : null}
      {filteredObjects.map((item) => {
        const subtitle = getObjectSubtitle(item);
        const userTagNames = getUserTagNames(item);

        return (
          <List.Item
            key={item.id}
            icon={getObjectIcon(item)}
            title={item.title?.trim() || "Untitled"}
            subtitle={subtitle}
            accessories={userTagNames.map((tagName) => ({ tag: tagName }))}
            keywords={[getObjectTypeLabel(item), ...item.tags.map((tag) => tag.name), subtitle ?? ""]}
            actions={<ObjectActions object={item} onDeleted={revalidate} onRefetch={revalidate} />}
          />
        );
      })}
    </List>
  );
}
