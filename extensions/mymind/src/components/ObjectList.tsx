import { Grid, Icon, List, getPreferenceValues } from "@raycast/api";
import { showFailureToast, useCachedPromise } from "@raycast/utils";
import { useMemo, useState } from "react";
import { getObjectScreenshotUrls, getObjectThumbnailUrls, listObjects } from "../api";
import {
  getObjectListIcon,
  getObjectPreviewSource,
  getObjectSubtitle,
  getObjectTypeLabel,
  getUserTagNames,
} from "../helpers";
import { getObjectDisplayTitle } from "../display-title";
import { getErrorEmptyView } from "../error-utils";
import { buildObjectQuery, TypeFilter } from "../object-query";
import { ObjectActions } from "./ObjectActions";
import { getObjectKind, matchesTypeFilter } from "../object-kind";

const OBJECT_FETCH_LIMIT = 200;

export type ObjectListLoaderArgs = {
  query: string | undefined;
  searchText: string;
  typeFilter: TypeFilter;
};

const GRID_TYPES = new Set<TypeFilter>(["image", "video", "pdf"]);
const GRID_COLUMN_OPTIONS = new Set([3, 4, 5, 6]);

function isGridType(typeFilter: TypeFilter): boolean {
  return GRID_TYPES.has(typeFilter);
}

function getMediaGridColumns(): number {
  const value = Number(getPreferenceValues<Preferences>().mediaGridColumns ?? "3");
  return GRID_COLUMN_OPTIONS.has(value) ? value : 3;
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
  datasetKey?: string;
  hiddenAccessoryTagNames?: string[];
  searchBarPlaceholder: string;
  emptyTitle: string;
  emptyDescription: string;
  initialType?: TypeFilter;
  loadObjects?: (
    args: ObjectListLoaderArgs,
  ) => Promise<ReturnType<typeof listObjects> extends Promise<infer T> ? T : never>;
  errorTitle?: string;
  errorEmptyView?: (error: unknown) => { title: string; description: string } | undefined;
}) {
  const datasetKey = props.datasetKey ?? "global";
  const hiddenAccessoryTagNames = new Set((props.hiddenAccessoryTagNames ?? []).map((name) => name.toLowerCase()));
  const [searchText, setSearchText] = useState("");
  const [selectedType, setSelectedType] = useState<TypeFilter>(props.initialType ?? "all");
  const [deletedObjectIds, setDeletedObjectIds] = useState<Set<string>>(new Set());

  const {
    data: objects = [],
    isLoading,
    error,
    revalidate,
  } = useCachedPromise(
    async (scopeKey: string, query: string, typeFilter: TypeFilter) => {
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
    [datasetKey, searchText, selectedType],
    {
      onError: (error) => {
        if (props.errorEmptyView?.(error)) {
          return;
        }

        void showFailureToast(error, { title: props.errorTitle ?? "Couldn't load your mymind items" });
      },
    },
  );

  async function handleObjectDeleted(objectId: string) {
    setDeletedObjectIds((current) => new Set(current).add(objectId));
    await revalidate();
  }

  const filteredObjects = useMemo(
    () =>
      objects.filter(
        (item) => !item.deleted && !deletedObjectIds.has(item.id) && matchesTypeFilter(item, selectedType),
      ),
    [deletedObjectIds, objects, selectedType],
  );
  const errorEmptyView = error
    ? (props.errorEmptyView?.(error) ?? getErrorEmptyView(error, props.errorTitle ?? "Couldn't load your mymind items"))
    : undefined;
  const shouldUseGrid = isGridType(selectedType);
  const mediaGridColumns = getMediaGridColumns();
  const mediaObjectIds = useMemo(
    () =>
      filteredObjects
        .filter((item) => {
          const kind = getObjectKind(item);
          return kind === "image" || kind === "video" || kind === "pdf";
        })
        .map((item) => item.id),
    [filteredObjects],
  );
  const { data: thumbnailUrls = {} } = useCachedPromise(
    async (scopeKey: string, ids: string[]) => await getObjectThumbnailUrls(ids, "1000x1000"),
    [datasetKey, mediaObjectIds],
    {
      initialData: {},
    },
  );
  const { data: screenshotUrls = {} } = useCachedPromise(
    async (scopeKey: string, ids: string[]) => await getObjectScreenshotUrls(ids),
    [datasetKey, mediaObjectIds],
    {
      initialData: {},
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
        key={`grid:${datasetKey}`}
        columns={mediaGridColumns}
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
          const userTagNames = getUserTagNames(item, 2).filter(
            (tagName) => !hiddenAccessoryTagNames.has(tagName.toLowerCase()),
          );

          return (
            <Grid.Item
              key={item.id}
              content={getObjectPreviewSource(item, {
                screenshotUrl: screenshotUrls[item.id],
                thumbnailUrl: thumbnailUrls[item.id],
              })}
              title={getObjectDisplayTitle(item)}
              subtitle={subtitle}
              keywords={[getObjectTypeLabel(item), ...item.tags.map((tag) => tag.name), subtitle ?? ""]}
              accessory={userTagNames.length > 0 ? { tooltip: userTagNames.join(", ") } : undefined}
              actions={
                <ObjectActions object={item} onDeleted={() => handleObjectDeleted(item.id)} onRefetch={revalidate} />
              }
            />
          );
        })}
      </Grid>
    );
  }

  return (
    <List
      key={`list:${datasetKey}`}
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
        const userTagNames = getUserTagNames(item).filter(
          (tagName) => !hiddenAccessoryTagNames.has(tagName.toLowerCase()),
        );

        return (
          <List.Item
            key={item.id}
            icon={getObjectListIcon(item, {
              screenshotUrl: screenshotUrls[item.id],
              thumbnailUrl: thumbnailUrls[item.id],
            })}
            title={getObjectDisplayTitle(item)}
            subtitle={subtitle}
            accessories={userTagNames.map((tagName) => ({ tag: tagName }))}
            keywords={[getObjectTypeLabel(item), ...item.tags.map((tag) => tag.name), subtitle ?? ""]}
            actions={
              <ObjectActions object={item} onDeleted={() => handleObjectDeleted(item.id)} onRefetch={revalidate} />
            }
          />
        );
      })}
    </List>
  );
}
