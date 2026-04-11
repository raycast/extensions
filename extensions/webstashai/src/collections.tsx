import {
  Action,
  ActionPanel,
  Icon,
  List,
  getPreferenceValues,
} from "@raycast/api";
import { showFailureToast, useCachedPromise } from "@raycast/utils";
import {
  getCollectionPages,
  handleApiError,
  listCollections,
} from "./api/client";
import PageListItem from "./components/PageListItem";
import { isValidApiKey } from "./helpers/utils";
import {
  getCacheAgeLabel,
  getInitialCollections,
  setCachedCollections,
} from "./shared-cache";

export default function BrowseCollectionsCommand() {
  const apiKey = getPreferenceValues<Preferences>().apiKey;
  if (!isValidApiKey(apiKey)) {
    return (
      <List>
        <List.EmptyView
          title="Invalid API Key"
          description="Your API key must start with 'wsk_'. Open extension preferences to update it."
          icon={Icon.ExclamationMark}
        />
      </List>
    );
  }

  const { data, isLoading } = useCachedPromise(
    async () => {
      const result = await listCollections();
      setCachedCollections(result.collections);
      return result.collections;
    },
    [],
    {
      initialData: getInitialCollections(),
      keepPreviousData: true,
      onError: async (error) => {
        const handled = await handleApiError(error);
        if (!handled) await showFailureToast("Failed to load collections");
      },
    },
  );

  const cacheLabel = getCacheAgeLabel();

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Filter collections..."
      navigationTitle={cacheLabel ?? "Browse Collections"}
    >
      <List.EmptyView
        title="No Collections Found"
        description="Collections are auto-generated when a tag appears on 2 or more indexed pages."
        icon={Icon.Folder}
      />
      {(data ?? []).map((collection) => (
        <List.Item
          key={collection.id}
          title={collection.name}
          icon={{ source: Icon.Folder, tintColor: "#6366F1" }}
          accessories={[
            {
              text: collection.page_count
                ? `${collection.page_count} ${collection.page_count === 1 ? "page" : "pages"}`
                : undefined,
            },
          ]}
          actions={
            <ActionPanel>
              <Action.Push
                title="View Collection Pages"
                icon={Icon.List}
                target={<CollectionPagesView collection={collection} />}
              />
              <Action.CopyToClipboard
                title="Copy Collection Name"
                content={collection.name}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

// ── Collection pages view ───────────────────────────────────────

function CollectionPagesView({
  collection,
}: {
  collection: { id: string; name: string };
}) {
  const { data, isLoading, pagination } = useCachedPromise(
    (collectionId: string) => async (options: { cursor?: string }) => {
      const offset = options.cursor ? Number(options.cursor) : undefined;
      const result = await getCollectionPages(collectionId, {
        cursor: offset,
      });
      return {
        data: result.pages,
        hasMore: result.has_more ?? false,
        cursor:
          result.next_offset !== undefined
            ? String(result.next_offset)
            : undefined,
      };
    },
    [collection.id],
    { keepPreviousData: true },
  );

  return (
    <List
      isLoading={isLoading}
      pagination={pagination}
      navigationTitle={collection.name}
      searchBarPlaceholder={`Filter pages in "${collection.name}"...`}
    >
      <List.EmptyView
        title="No Pages in Collection"
        description={`No indexed pages found in "${collection.name}"`}
        icon={Icon.Folder}
      />
      {(data ?? []).map((page) => (
        <PageListItem key={page.id} page={page} />
      ))}
    </List>
  );
}
