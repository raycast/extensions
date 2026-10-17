import {
  Action,
  ActionPanel,
  Alert,
  Clipboard,
  confirmAlert,
  Icon,
  Keyboard,
  List,
  showToast,
  Toast,
} from "@raycast/api";
import {
  $collections,
  $currentCollectionId,
  deleteCollection,
  deleteRequest,
  initializeDefaultCollection,
  moveRequest,
} from "./store";
import { CollectionForm } from "~/views/collection-form";
import { RequestForm } from "~/views/request-form";
import { Collection, Method, Request } from "~/types";
import { $currentEnvironmentId, $environments, initializeDefaultEnvironment } from "~/store/environments";
import { CollectionActions, GlobalActions, NewRequestFromCurlAction, SortRequestsMenu } from "~/components/actions";
import { useAtom } from "zod-persist/react";
import { DEFAULT_COLLECTION_NAME, METHODS, SORT_OPTIONS } from "~/constants";
import { generateCurlCommand } from "./utils/curl-to-request";
import { $cookies } from "./store/cookies";
import { $history } from "./store/history";
import { useEffect, useMemo, useState } from "react";
import { useRunRequest } from "./hooks/use-run-request";
import { substitutePlaceholders } from "./utils/environment-utils";
import { $collectionSortPreferences } from "./store/settings";
import { useVariables } from "./hooks/use-variables";

/**
 * CommonActions contains view-specific actions that need to be available
 * in both the List's default ActionPanel and individual List.Item ActionPanels.
 *
 * This is necessary because Raycast's List.Item ActionPanel completely overrides
 * the List's ActionPanel, so we need to explicitly include these in both places.
 *
 * For truly global actions available everywhere, see GlobalActions in ~/components/actions.tsx
 */
function CommonActions({ currentCollection }: { currentCollection: Collection | null }) {
  return (
    <>
      {currentCollection && (
        <Action.Push
          key={"new-request"}
          title="New Request"
          shortcut={Keyboard.Shortcut.Common.New}
          // shortcut={{ modifiers: ["cmd"], key: "n" }}
          target={<RequestForm collectionId={currentCollection.id} request={{}} />}
          icon={Icon.PlusCircle}
        />
      )}
      <NewRequestFromCurlAction />
      {currentCollection && (
        <SortRequestsMenu
          currentCollection={currentCollection}
          onSort={async (sortKey) => {
            const prefs = $collectionSortPreferences.get();
            $collectionSortPreferences.set({
              ...prefs,
              [currentCollection.id]: sortKey,
            });
            await showToast({ title: "Requests Sorted" });
          }}
        />
      )}

      <CollectionActions>
        {currentCollection && currentCollection.title !== DEFAULT_COLLECTION_NAME ? (
          <Action.Push
            key={"edit-request"}
            title="Edit Collection"
            shortcut={{
              macOS: { modifiers: ["cmd", "shift"], key: "e" },
              windows: { modifiers: ["ctrl", "shift"], key: "e" },
            }}
            target={<CollectionForm collectionId={currentCollection.id} />}
            icon={Icon.Pencil}
          />
        ) : null}
      </CollectionActions>
      <Action.Push
        key={"create-request"}
        title="Create Collection"
        shortcut={{
          macOS: { modifiers: ["cmd", "shift"], key: "n" },
          windows: { modifiers: ["ctrl", "shift"], key: "n" },
        }}
        target={<CollectionForm />}
        icon={Icon.PlusTopRightSquare}
      />
      {currentCollection && (
        <Action
          title="Delete Collection"
          icon={Icon.Trash}
          style={Action.Style.Destructive}
          shortcut={Keyboard.Shortcut.Common.RemoveAll}
          onAction={async () => {
            if (
              await confirmAlert({
                title: `Delete "${currentCollection.title}"?`,
                message: "Are you sure? All requests within this collection will also be deleted.",
                primaryAction: { title: "Delete", style: Alert.ActionStyle.Destructive },
              })
            ) {
              await deleteCollection(currentCollection.id);
              await showToast({ style: Toast.Style.Success, title: "Collection Deleted" });
            }
          }}
        />
      )}
    </>
  );
}

export function CollectionDropdown() {
  const { value: collections } = useAtom($collections);
  const { value: currentId } = useAtom($currentCollectionId);

  return (
    <List.Dropdown
      tooltip="Select Collection"
      value={currentId ?? undefined}
      onChange={(newValue) => {
        // 1. Find the collection that was just selected using `newValue`.
        const newCollection = collections.find((c) => c.id === newValue);

        // 2. Set the active environment based on the NEW collection's preference.
        $currentEnvironmentId.set(newCollection?.lastActiveEnvironmentId ?? null);

        // 3. Set the current collection ID to the new value.
        $currentCollectionId.set(newValue);
      }}
    >
      <List.Dropdown.Section title="Collections">
        {collections.map((c) => {
          return <List.Dropdown.Item key={c.id} title={c.title} value={c.id} />;
        })}
      </List.Dropdown.Section>
    </List.Dropdown>
  );
}

function useStoresReady(atoms: Array<{ ready: Promise<void> }>) {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    async function checkReady() {
      // Wait for all the provided atoms to finish their hydration
      await Promise.all(atoms.map((atom) => atom.ready));
      setIsReady(true);
    }
    void checkReady();
  }, []); // The empty array ensures this runs only once

  return isReady;
}

async function initializeApp() {
  // Use Promise.allSettled to wait for all promises, even if some fail.
  const stores = [
    { atom: $collections, name: "Collections" },
    { atom: $environments, name: "Environments" },
    { atom: $cookies, name: "Cookies" },
    { atom: $history, name: "History" },
  ];

  const results = await Promise.allSettled(stores.map((s) => s.atom.ready));

  // Check if any of the hydration promises were rejected.
  const failedStores = results
    .map((result, index) => ({ result, store: stores[index].name }))
    .filter(({ result }) => result.status === "rejected");
  if (failedStores.length > 0) {
    const storeList = failedStores.map(({ store }) => store).join(", ");
    await showToast({
      style: Toast.Style.Failure,
      title: "Failed to Load Some Data",
      message: `Failed stores: ${storeList}`,
    });
  }

  // Now, proceed with initialization. This will create defaults for any
  // stores that failed to load and are currently empty.
  try {
    await initializeDefaultCollection();
  } catch {
    void showToast({
      style: Toast.Style.Failure,
      title: "Failed to Initialize",
      message: "Could not create default collection",
    });
  }

  try {
    await initializeDefaultEnvironment();
  } catch {
    void showToast({
      style: Toast.Style.Failure,
      title: "Failed to Initialize",
      message: "Could not create default environment",
    });
  }
}

interface RequestListItemProps {
  request: Request;
  currentCollection: Collection;
  collections: readonly Collection[];
}

function RequestListItem({ request, currentCollection, collections }: RequestListItemProps) {
  const { execute: run, cancel, isLoading } = useRunRequest();

  const variables = useVariables();

  const displayTitle = substitutePlaceholders(request.title || request.url, variables) ?? "";
  const displaySubtitle = request.title ? substitutePlaceholders(request.url, variables) : undefined;

  return (
    <List.Item
      key={request.id}
      title={displayTitle}
      subtitle={displaySubtitle}
      accessories={[
        {
          tag: {
            value: request.method,
            color: METHODS[request.method]?.color,
          },
        },
      ]}
      actions={
        <ActionPanel>
          <Action.Push
            key={"edit-request"}
            title="Open Request"
            icon={Icon.ChevronRight}
            target={<RequestForm collectionId={currentCollection.id} request={request} />}
          />
          {isLoading ? (
            <Action title="Cancel Request" icon={Icon.XMarkCircle} onAction={cancel} style={Action.Style.Destructive} />
          ) : (
            <Action title="Run Request" icon={Icon.Bolt} onAction={() => run(request, currentCollection)} />
          )}
          <Action
            title="Copy as cURL"
            icon={Icon.Terminal}
            onAction={async () => {
              const { command, hasTempVars } = generateCurlCommand(request, currentCollection);

              if (hasTempVars) {
                const shouldCopy = await confirmAlert({
                  title: "Contains Temporary Variables",
                  message:
                    "This cURL command contains temporary variables from pre-request actions, which can't be used in standalone cURL. Environment variables will work fine.",
                  primaryAction: { title: "Copy Anyway", style: Alert.ActionStyle.Default },
                  dismissAction: { title: "Cancel" },
                });

                if (shouldCopy) {
                  await Clipboard.copy(command);
                  await showToast({
                    style: Toast.Style.Success,
                    title: "Copied to Clipboard",
                    message: "Replace temporary variables manually",
                  });
                }
              } else {
                await Clipboard.copy(command);
                await showToast({
                  style: Toast.Style.Success,
                  title: "Copied to Clipboard",
                });
              }
            }}
            shortcut={Keyboard.Shortcut.Common.Copy}
          />

          <CommonActions currentCollection={currentCollection} />
          <ActionPanel.Submenu
            title="Move Request to Another Collection"
            icon={Icon.Switch}
            shortcut={{ macOS: { modifiers: ["cmd"], key: "m" }, windows: { modifiers: ["ctrl"], key: "m" } }}
          >
            {collections.map((c) => (
              <Action
                key={`col-${c.id}`}
                title={`Move to "${c.title}"`}
                onAction={() => moveRequest(request.id, currentCollection.id, c.id)}
              />
            ))}
          </ActionPanel.Submenu>
          <Action
            title="Delete Request"
            icon={Icon.Trash}
            style={Action.Style.Destructive}
            shortcut={Keyboard.Shortcut.Common.Remove}
            onAction={async () => {
              if (
                await confirmAlert({
                  title: "Delete Request?",
                  message: "Are you sure you want to delete this request? This cannot be undone.",
                  primaryAction: { title: "Delete", style: Alert.ActionStyle.Destructive },
                })
              ) {
                await deleteRequest(currentCollection.id, request.id);
                await showToast({ style: Toast.Style.Success, title: "Request Deleted" });
              }
            }}
          />
          <GlobalActions />
        </ActionPanel>
      }
    />
  );
}

export default function RequestList() {
  useEffect(() => {
    void initializeApp().catch(console.error);
  }, []);

  const isReady = useStoresReady([
    $collections,
    $currentCollectionId,
    $environments,
    $currentEnvironmentId,
    $history,
    $cookies,
  ]);

  const { value: collections } = useAtom($collections);
  const { value: currentCollectionId } = useAtom($currentCollectionId);
  const currentCollection = collections.find((c) => c.id === currentCollectionId);
  const { value: currentEnvironmentId } = useAtom($currentEnvironmentId);
  const { value: environments } = useAtom($environments);
  const currentEnvironment = environments.find((e) => e.id === currentEnvironmentId);

  const { value: sortPreferences } = useAtom($collectionSortPreferences);
  const { isLoading } = useRunRequest();
  const sortBy = currentCollection ? sortPreferences[currentCollection.id] : undefined;

  const displayedRequests = useMemo(() => {
    if (!currentCollection?.requests) return [];

    const requests = [...currentCollection.requests];

    const methodOrder: Method[] = ["GET", "POST", "PUT", "PATCH", "DELETE", "GRAPHQL"];
    switch (sortBy) {
      case SORT_OPTIONS.NAME_ASC:
        return requests.sort((a, b) => (a.title || a.url).localeCompare(b.title || b.url));
      case SORT_OPTIONS.NAME_DESC:
        return requests.sort((a, b) => (b.title || b.url).localeCompare(a.title || a.url));
      case SORT_OPTIONS.METHOD:
        return requests.sort((a, b) => methodOrder.indexOf(a.method) - methodOrder.indexOf(b.method));
      case SORT_OPTIONS.URL:
        return requests.sort((a, b) => a.url.localeCompare(b.url));
      case SORT_OPTIONS.MANUAL:
      default:
        return requests; // Original order
    }
  }, [currentCollection, sortBy]);

  if (!isReady) {
    return <List isLoading={true} />;
  }
  return (
    <List
      isLoading={!isReady || isLoading}
      navigationTitle={`${currentEnvironment?.name ? currentEnvironment.name : environments.length === 0 ? "rhttp" : "No environments selected"}`}
      searchBarPlaceholder="Search requests..."
      searchBarAccessory={<CollectionDropdown />}
      actions={
        <ActionPanel>
          {currentCollection && <CommonActions currentCollection={currentCollection} />}
          <GlobalActions />
        </ActionPanel>
      }
    >
      {currentCollection &&
        displayedRequests?.map((request) => {
          return (
            <RequestListItem
              key={request.id}
              request={request}
              currentCollection={currentCollection}
              collections={collections}
            />
          );
        })}
    </List>
  );
}
