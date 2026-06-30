import { Grid, Icon, List } from "@raycast/api";
import { showFailureToast, useCachedPromise } from "@raycast/utils";
import { useMemo, useState } from "react";
import { getObjectScreenshotUrls, getObjectThumbnailUrls, listObjects } from "../api";
import {
  getObjectIcon,
  getObjectPreviewSource,
  getObjectSubtitle,
  getObjectTypeLabel,
  getUserTagNames,
} from "../helpers";
import { getObjectDisplayTitle } from "../display-title";
import { buildObjectQuery, TypeFilter } from "../object-query";
import { ObjectActions } from "./ObjectActions";

const OBJECT_FETCH_LIMIT = 200;

export type ObjectListLoaderArgs = {
  query: string | undefined;
  searchText: string;
  typeFilter: TypeFilter;
};

const GRID_TYPES = new Set<TypeFilter>(["image", "video", "pdf"]);

function isGridType(typeFilter: TypeFilter): boolean {
  return GRID_TYPES.has(typeFilter);
}

function getTypeFilterIcon(typeFilter: TypeFilter): Icon {
  switch (typeFilter) {
    case "image":
      return Icon.Image;
    case "article":
      return Icon.Globe;
    case "note":
      return Icon.Pencil;
    case "video":
      return Icon.Video;
    case "pdf":
      return Icon.Document;
    default:
      return Icon.List;
  }
}

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
  const [deletedObjectIds, setDeletedObjectIds] = useState<Set<string>>(new Set());

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

  async function handleObjectDeleted(objectId: string) {
    setDeletedObjectIds((current) => new Set(current).add(objectId));
    await revalidate();
  }

  const filteredObjects = useMemo(
    () => objects.filter((item) => !item.deleted && !deletedObjectIds.has(item.id)),
    [deletedObjectIds, objects],
  );
  const errorEmptyView = error ? props.errorEmptyView?.(error) : undefined;
  const shouldUseGrid = isGridType(selectedType);
  const mediaObjectIds = useMemo(
    () => (shouldUseGrid ? filteredObjects.map((item) => item.id) : []),
    [filteredObjects, shouldUseGrid],
  );
  const { data: thumbnailUrls = {} } = useCachedPromise(
    async (ids: string[]) => await getObjectThumbnailUrls(ids, "1000x1000"),
    [mediaObjectIds],
    {
      initialData: {},
      keepPreviousData: true,
    },
  );
  const { data: screenshotUrls = {} } = useCachedPromise(
    async (ids: string[]) => await getObjectScreenshotUrls(ids),
    [mediaObjectIds],
    {
      initialData: {},
      keepPreviousData: true,
    },
  );
  const dropdown = (
    <List.Dropdown
      tooltip="Filter Results"
      value={selectedType}
      onChange={(value) => setSelectedType(value as TypeFilter)}
    >
      <List.Dropdown.Section title="Type">
        <List.Dropdown.Item title="All Types" value="all" icon={getTypeFilterIcon("all")} />
        <List.Dropdown.Item title="Images" value="image" icon={getTypeFilterIcon("image")} />
        <List.Dropdown.Item title="Articles" value="article" icon={getTypeFilterIcon("article")} />
        <List.Dropdown.Item title="Notes" value="note" icon={getTypeFilterIcon("note")} />
        <List.Dropdown.Item title="Videos" value="video" icon={getTypeFilterIcon("video")} />
        <List.Dropdown.Item title="PDFs" value="pdf" icon={getTypeFilterIcon("pdf")} />
      </List.Dropdown.Section>
    </List.Dropdown>
  );

  if (shouldUseGrid) {
    return (
      <Grid
        columns={6}
        aspectRatio="4/3"
        fit={Grid.Fit.Fill}
        filtering={false}
        isLoading={isLoading}
        onSearchTextChange={setSearchText}
        searchBarPlaceholder={props.searchBarPlaceholder}
        searchBarAccessory={dropdown}
        throttle
      >
        {filteredObjects.length === 0 ? (
          <Grid.EmptyView
            title={errorEmptyView?.title ?? props.emptyTitle}
            description={errorEmptyView?.description ?? props.emptyDescription}
          />
        ) : null}
        {filteredObjects.map((item) => {
          const subtitle = getObjectSubtitle(item);
          const userTagNames = getUserTagNames(item, 2);

          return (
            <Grid.Item
              key={item.id}
              content={{
                source: getObjectPreviewSource(item, {
                  screenshotUrl: screenshotUrls[item.id],
                  thumbnailUrl: thumbnailUrls[item.id],
                }),
              }}
              title={getObjectDisplayTitle(item)}
              subtitle={subtitle}
              keywords={[getObjectTypeLabel(item), ...item.tags.map((tag) => tag.name), subtitle ?? ""]}
              accessory={userTagNames.length > 0 ? { text: userTagNames.join(", ") } : undefined}
              actions={<ObjectActions object={item} onDeleted={() => handleObjectDeleted(item.id)} onRefetch={revalidate} />}
            />
          );
        })}
      </Grid>
    );
  }

  return (
    <List
      filtering={false}
      isLoading={isLoading}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder={props.searchBarPlaceholder}
      throttle
      searchBarAccessory={dropdown}
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
            title={getObjectDisplayTitle(item)}
            subtitle={subtitle}
            accessories={userTagNames.map((tagName) => ({ tag: tagName }))}
            keywords={[getObjectTypeLabel(item), ...item.tags.map((tag) => tag.name), subtitle ?? ""]}
            actions={<ObjectActions object={item} onDeleted={() => handleObjectDeleted(item.id)} onRefetch={revalidate} />}
          />
        );
      })}
    </List>
  );
}
