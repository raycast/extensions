import {
  Action,
  ActionPanel,
  Color,
  Detail,
  Icon,
  Keyboard,
  LaunchProps,
  LaunchType,
  List,
  LocalStorage,
  Toast,
  launchCommand,
  openExtensionPreferences,
  showToast,
} from "@raycast/api";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Collection,
  Pagination,
  Resource,
  ResourceStatusFilter,
  SpinalError,
  cacheResources,
  clearCache,
  clearResourceCache,
  errorMessage,
  errorTitle,
  fetchCollections,
  fetchResources,
  lastCollectionKey,
  loadCachedResources,
  primaryFieldKey,
  resourceStatusFilters,
  resourceUrl,
  toSpinalError,
} from "./spinal";

const pageSize = 20;

interface StatusMetadata {
  label: string;
  icon: Icon;
  color: Color;
}

function statusMetadata(status: string): StatusMetadata {
  switch (status) {
    case "published":
      return { label: "Published", icon: Icon.CheckCircle, color: Color.Green };
    case "scheduled":
      return { label: "Scheduled", icon: Icon.Clock, color: Color.Blue };
    case "draft":
      return { label: "Draft", icon: Icon.Pencil, color: Color.Orange };
    default:
      return { label: status, icon: Icon.Circle, color: Color.SecondaryText };
  }
}

const statusFilterLabels: Record<ResourceStatusFilter, string> = {
  all: "All Statuses",
  draft: "Draft",
  scheduled: "Scheduled",
  published: "Published",
};

function formatFieldValue(value: unknown): string {
  if (value === null || value === undefined) return "";

  if (Array.isArray(value))
    return value.map((entry) => String(entry)).join(", ");

  if (typeof value === "object") return JSON.stringify(value);

  return String(value);
}

function fieldEntries(resource: Resource): [string, string][] {
  return Object.entries(resource.field_values ?? {}).map(([key, value]) => [
    key,
    formatFieldValue(value),
  ]);
}

function formatDate(value: string): string {
  const date = new Date(value);

  return isNaN(date.getTime()) ? value : date.toLocaleString();
}

function resourceTitle(resource: Resource, collection?: Collection): string {
  if (resource.anchor?.trim()) return resource.anchor.trim();

  if (collection) {
    const primaryKey = primaryFieldKey(collection);

    if (primaryKey) {
      const primaryValue = formatFieldValue(
        resource.field_values?.[primaryKey],
      ).trim();

      if (primaryValue) return primaryValue;
    }
  }

  const title = resource.field_values?.title;

  if (typeof title === "string" && title.trim()) return title.trim();

  return resource.filename || resource.id;
}

function hasMorePages(pagination?: Pagination): boolean {
  return Boolean(pagination && pagination.page < pagination.last);
}

interface ResourceGroup {
  key: string;
  title: string;
  items: Resource[];
}

function startOfDayMilliseconds(date: Date): number {
  return new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
  ).getTime();
}

function dayKey(iso: string): string {
  const date = new Date(iso);

  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

function dayLabel(iso: string, now: Date): string {
  const date = new Date(iso);
  const differenceInDays = Math.round(
    (startOfDayMilliseconds(date) - startOfDayMilliseconds(now)) / 86_400_000,
  );

  if (differenceInDays === 0) return "Today";
  if (differenceInDays === 1) return "Tomorrow";
  if (differenceInDays === -1) return "Yesterday";

  const isSameYear = date.getFullYear() === now.getFullYear();

  return date.toLocaleDateString(
    undefined,
    isSameYear
      ? { weekday: "short", day: "numeric", month: "short" }
      : { day: "numeric", month: "short", year: "numeric" },
  );
}

function groupResources(
  resources: Resource[],
  ascending: boolean,
): ResourceGroup[] {
  const now = new Date();
  const groups = new Map<string, ResourceGroup>();
  const undatedResources: Resource[] = [];

  for (const resource of resources) {
    if (!resource.published_at) {
      undatedResources.push(resource);
      continue;
    }

    const key = dayKey(resource.published_at);
    const group = groups.get(key);

    if (group) {
      group.items.push(resource);
    } else {
      groups.set(key, {
        key,
        title: dayLabel(resource.published_at, now),
        items: [resource],
      });
    }
  }

  const publishedTime = (resource: Resource) =>
    new Date(resource.published_at as string).getTime();

  const sortedGroups = [...groups.values()];

  sortedGroups.sort((first, second) => {
    const firstTime = publishedTime(first.items[0]);
    const secondTime = publishedTime(second.items[0]);

    return ascending ? firstTime - secondTime : secondTime - firstTime;
  });

  for (const group of sortedGroups) {
    group.items.sort((first, second) => {
      const firstTime = publishedTime(first);
      const secondTime = publishedTime(second);

      return ascending ? firstTime - secondTime : secondTime - firstTime;
    });
  }

  if (undatedResources.length > 0) {
    sortedGroups.push({
      key: "undated",
      title: "No publish date",
      items: undatedResources,
    });
  }

  return sortedGroups;
}

function ResourceDetail({ resource }: { resource: Resource }) {
  const status = statusMetadata(resource.status);
  const entries = fieldEntries(resource);

  return (
    <List.Item.Detail
      markdown={
        resource.body?.trim() ? resource.body : "_This resource has no body._"
      }
      metadata={
        <List.Item.Detail.Metadata>
          <List.Item.Detail.Metadata.Label
            title="Status"
            text={status.label}
            icon={{ source: status.icon, tintColor: status.color }}
          />
          <List.Item.Detail.Metadata.Label title="ID" text={resource.id} />
          {resource.filename ? (
            <List.Item.Detail.Metadata.Label
              title="File"
              text={resource.filename}
            />
          ) : null}
          {resource.relative_path ? (
            <List.Item.Detail.Metadata.Label
              title="Path"
              text={resource.relative_path}
            />
          ) : null}
          {resource.published_at ? (
            <List.Item.Detail.Metadata.Label
              title="Published"
              text={formatDate(resource.published_at)}
            />
          ) : null}
          {resource.created_at ? (
            <List.Item.Detail.Metadata.Label
              title="Created"
              text={formatDate(resource.created_at)}
            />
          ) : null}
          {resource.updated_at ? (
            <List.Item.Detail.Metadata.Label
              title="Updated"
              text={formatDate(resource.updated_at)}
            />
          ) : null}
          {resource.creator?.name ? (
            <List.Item.Detail.Metadata.Label
              title="Creator"
              text={resource.creator.name}
            />
          ) : null}
          {entries.length > 0 ? (
            <>
              <List.Item.Detail.Metadata.Separator />
              <List.Item.Detail.Metadata.Label title="Frontmatter" />
              {entries.map(([key, value]) => (
                <List.Item.Detail.Metadata.Label
                  key={key}
                  title={key}
                  text={value}
                />
              ))}
            </>
          ) : null}
        </List.Item.Detail.Metadata>
      }
    />
  );
}

export default function Command(props: LaunchProps) {
  const launchedCollectionId = props.launchContext?.collectionId;

  const [collections, setCollections] = useState<Collection[]>([]);
  const [selectedCollectionId, setSelectedCollectionId] = useState<string>();
  const [statusFilter, setStatusFilter] = useState<ResourceStatusFilter>("all");
  const [resources, setResources] = useState<Resource[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [loadError, setLoadError] = useState<SpinalError>();
  const [reloadKey, setReloadKey] = useState(0);

  const latestRequestId = useRef(0);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const result = await fetchCollections();
        const lastUsed = await LocalStorage.getItem<string>(lastCollectionKey);
        const candidates = [launchedCollectionId, lastUsed]
          .filter((id): id is string => Boolean(id))
          .filter((id) => result.some((collection) => collection.id === id));

        if (cancelled) return;

        setCollections(result);

        const firstCollectionId = candidates[0] ?? result[0]?.id;

        setSelectedCollectionId(firstCollectionId);

        if (!firstCollectionId) setIsLoading(false);
      } catch (error) {
        if (cancelled) return;

        setLoadError(toSpinalError(error));
        setIsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [launchedCollectionId, reloadKey]);

  useEffect(() => {
    if (!selectedCollectionId) return;

    const requestId = latestRequestId.current + 1;

    latestRequestId.current = requestId;
    setLoadError(undefined);

    const cachedResources = loadCachedResources(
      selectedCollectionId,
      statusFilter,
    );

    if (cachedResources) {
      setResources(cachedResources.data);
      setPage(cachedResources.pagination?.page ?? 1);
      setHasMore(hasMorePages(cachedResources.pagination));
      setIsLoading(false);

      return;
    }

    setIsLoading(true);

    (async () => {
      try {
        const response = await fetchResources(selectedCollectionId, {
          status: statusFilter,
          page: 1,
          limit: pageSize,
        });

        if (latestRequestId.current !== requestId) return;

        setResources(response.data);
        setPage(1);
        setHasMore(hasMorePages(response.pagination));
        cacheResources(selectedCollectionId, statusFilter, response);
      } catch (error) {
        if (latestRequestId.current !== requestId) return;

        setLoadError(toSpinalError(error));
      } finally {
        if (latestRequestId.current === requestId) setIsLoading(false);
      }
    })();
  }, [selectedCollectionId, statusFilter, reloadKey]);

  const loadNextPage = useCallback(async () => {
    if (!selectedCollectionId || !hasMore || isLoadingMore) return;

    const requestId = latestRequestId.current;

    setIsLoadingMore(true);

    try {
      const nextPage = page + 1;
      const response = await fetchResources(selectedCollectionId, {
        status: statusFilter,
        page: nextPage,
        limit: pageSize,
      });

      if (latestRequestId.current !== requestId) return;

      setResources((previousResources) => {
        const mergedResources = [...previousResources, ...response.data];

        cacheResources(selectedCollectionId, statusFilter, {
          data: mergedResources,
          pagination: response.pagination,
        });

        return mergedResources;
      });

      setPage(nextPage);
      setHasMore(hasMorePages(response.pagination));
    } catch (error) {
      if (latestRequestId.current !== requestId) return;

      await showToast({
        style: Toast.Style.Failure,
        title: errorTitle(error),
        message: errorMessage(error),
      });
    } finally {
      setIsLoadingMore(false);
    }
  }, [selectedCollectionId, statusFilter, page, hasMore, isLoadingMore]);

  function refreshResources() {
    if (selectedCollectionId) clearResourceCache(selectedCollectionId);

    setIsLoading(true);
    setReloadKey((key) => key + 1);
  }

  function resetCachedData() {
    clearCache();
    setIsLoading(true);
    setReloadKey((key) => key + 1);
  }

  async function launchCreateResource() {
    if (!selectedCollectionId) return;

    await launchCommand({
      name: "create-resource",
      type: LaunchType.UserInitiated,
      context: { collectionId: selectedCollectionId },
    });
  }

  if (loadError) {
    const guidance =
      loadError.status === 401
        ? "\n\nCheck your API key in the extension settings. Create one in Spinal under Settings > API."
        : loadError.status === 402
          ? "\n\nYour Spinal plan does not include API access."
          : "";

    return (
      <Detail
        markdown={`## ${errorTitle(loadError)}\n\n${errorMessage(
          loadError,
        )}${guidance}`}
        actions={
          <ActionPanel>
            <Action
              title="Retry"
              icon={Icon.ArrowClockwise}
              onAction={refreshResources}
            />
            <Action
              title="Update API Key"
              icon={Icon.Key}
              onAction={() => openExtensionPreferences()}
            />
          </ActionPanel>
        }
      />
    );
  }

  const selectedCollection = collections.find(
    (collection) => collection.id === selectedCollectionId,
  );

  const groups = useMemo(
    () => groupResources(resources, statusFilter === "scheduled"),
    [resources, statusFilter],
  );

  function resourceListItem(resource: Resource) {
    const status = statusMetadata(resource.status);
    const title = resourceTitle(resource, selectedCollection);

    return (
      <List.Item
        key={resource.id}
        icon={status.icon}
        title={title}
        detail={<ResourceDetail resource={resource} />}
        actions={
          <ActionPanel>
            <ActionPanel.Section>
              <Action.OpenInBrowser
                title="Open in Spinal"
                icon={Icon.Globe}
                url={resourceUrl(resource.id)}
              />
              <Action.CopyToClipboard
                title="Copy Markdown Body"
                icon={Icon.Clipboard}
                content={resource.body ?? ""}
                shortcut={{ modifiers: ["cmd"], key: "c" }}
              />
              <Action.CopyToClipboard
                title="Copy Resource ID"
                icon={Icon.Hashtag}
                content={resource.id}
              />
              <Action.CopyToClipboard
                title="Copy Filename"
                icon={Icon.Document}
                content={resource.filename}
              />
            </ActionPanel.Section>
            <ActionPanel.Section>
              <Action
                title="Create Resource in This Collection"
                icon={Icon.PlusSquare}
                shortcut={Keyboard.Shortcut.Common.New}
                onAction={launchCreateResource}
              />
            </ActionPanel.Section>
            <ActionPanel.Section title="Filter">
              <ActionPanel.Submenu
                title={`Status: ${statusFilterLabels[statusFilter]}`}
                icon={Icon.Filter}
              >
                {resourceStatusFilters.map((filter) => (
                  <Action
                    key={filter}
                    title={statusFilterLabels[filter]}
                    icon={
                      filter === statusFilter ? Icon.Checkmark : Icon.Circle
                    }
                    onAction={() => setStatusFilter(filter)}
                  />
                ))}
              </ActionPanel.Submenu>
            </ActionPanel.Section>
            <ActionPanel.Section title="Configuration">
              <Action
                title="Refresh"
                icon={Icon.ArrowClockwise}
                shortcut={Keyboard.Shortcut.Common.Refresh}
                onAction={refreshResources}
              />
              <Action
                title="Reset Cached Data"
                icon={Icon.Trash}
                onAction={resetCachedData}
              />
              <Action
                title="Update API Key"
                icon={Icon.Key}
                onAction={() => openExtensionPreferences()}
              />
            </ActionPanel.Section>
          </ActionPanel>
        }
      />
    );
  }

  return (
    <List
      isLoading={isLoading || isLoadingMore}
      isShowingDetail
      navigationTitle="Browse Resources"
      searchBarAccessory={
        <List.Dropdown
          tooltip="Select Collection"
          value={selectedCollectionId}
          onChange={setSelectedCollectionId}
        >
          {collections.map((collection) => (
            <List.Dropdown.Item
              key={collection.id}
              value={collection.id}
              title={collection.name}
            />
          ))}
        </List.Dropdown>
      }
      pagination={{
        pageSize,
        hasMore,
        onLoadMore: () => {
          void loadNextPage();
        },
      }}
    >
      {groups.map((group) => (
        <List.Section key={group.key} title={group.title}>
          {group.items.map((resource) => resourceListItem(resource))}
        </List.Section>
      ))}
      {groups.length === 0 ? (
        <List.EmptyView
          icon={Icon.Document}
          title={
            statusFilter === "all"
              ? "No resources"
              : `No ${statusFilter} resources`
          }
          description={
            selectedCollection
              ? `Nothing in "${selectedCollection.name}" matches this filter.`
              : "No collection selected."
          }
        />
      ) : null}
    </List>
  );
}
