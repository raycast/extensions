import { useMemo, useState } from "react";
import { Action, ActionPanel, Icon, List, openExtensionPreferences } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { DriveNode, listFolderCached } from "../lib/cli";
import { isDemo } from "../lib/demo";
import { showError } from "../lib/errors";
import { forgetLocalData, isSignedOut } from "../lib/session";
import { searchIndex, searchNodes } from "../lib/search";
import { SORT_ORDERS, SortOrder, sortNodes } from "../lib/sort";
import { useDriveIndex } from "../lib/useDriveIndex";
import { useSelectedFolder } from "../lib/useSelectedFolder";
import { displayPath } from "./NodeActions";
import { NodeItem } from "./NodeItem";
import { SignedOutView } from "./SignedOutView";

const MAX_DRIVE_RESULTS = 100;

/**
 * One folder of the Drive. Typing filters this folder and, when the search index exists,
 * also searches the whole Drive.
 *
 * A folder seen before is shown instantly from Raycast's cache, then refreshed from the CLI
 * (each CLI call takes a few seconds).
 */
export function FolderView(props: { path: string; title?: string }) {
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortOrder>("name");
  const [signedOut, setSignedOut] = useState(false);
  const { index, progress, refresh } = useDriveIndex();
  const demo = isDemo();
  const { data, isLoading, revalidate } = useCachedPromise(listFolderCached, [props.path, demo ? "demo" : "live"], {
    onError: async (error) => {
      if (isSignedOut(error)) {
        // Never keep showing cached Drive content once the session is gone.
        setSignedOut(true);
        await forgetLocalData();
      } else {
        await showError(error, "Could not list folder");
      }
    },
  });

  const here = useMemo(() => {
    // While searching, results are ranked by relevance; otherwise by the chosen order.
    return query ? searchNodes(data ?? [], query) : sortNodes(data ?? [], sort);
  }, [data, query, sort]);

  const elsewhere = useMemo(() => {
    if (!query || !index) return [];
    // Index nodes are keyed by path, listing nodes by Proton UID: compare paths.
    const shownPaths = new Set(here.map((n) => n.path));
    return searchIndex(index, query, MAX_DRIVE_RESULTS + here.length)
      .filter((n) => !shownPaths.has(n.path))
      .slice(0, MAX_DRIVE_RESULTS);
  }, [query, index, here]);

  const all = useMemo(() => [...here, ...elsewhere], [here, elsewhere]);
  const { selectedUid, contents, onSelectionChange } = useSelectedFolder(all);
  const indexActions = <IndexActions hasIndex={Boolean(index)} onRefresh={() => refresh(false)} />;

  const item = (node: DriveNode, showPath = false) => (
    <NodeItem
      key={node.uid}
      node={node}
      showPath={showPath}
      contents={node.uid === selectedUid ? contents : undefined}
      sort={sort}
      extraActions={indexActions}
    />
  );

  if (signedOut) return <SignedOutView />;

  return (
    <List
      isLoading={isLoading || Boolean(progress)}
      isShowingDetail={all.length > 0}
      filtering={false}
      onSearchTextChange={setQuery}
      throttle
      navigationTitle={progress ? `Indexing — ${progress}` : (props.title ?? props.path)}
      searchBarPlaceholder={`Search in ${props.title ?? displayPath(props.path)}${index ? " and the whole Drive" : ""}…`}
      onSelectionChange={onSelectionChange}
      searchBarAccessory={
        <List.Dropdown tooltip="Sort By" storeValue onChange={(v) => setSort(v as SortOrder)}>
          {SORT_ORDERS.map((o) => (
            <List.Dropdown.Item key={o.value} title={`Sort by ${o.title}`} value={o.value} />
          ))}
        </List.Dropdown>
      }
    >
      <List.EmptyView
        icon={query ? Icon.MagnifyingGlass : Icon.Folder}
        title={isLoading ? "Loading…" : query ? "No results" : "Empty folder"}
        description={query && !index ? "To search the whole Drive, build the search index (⌘K)." : undefined}
        actions={
          <ActionPanel>
            <Action title="Reload" icon={Icon.ArrowClockwise} onAction={revalidate} />
            {indexActions}
          </ActionPanel>
        }
      />
      <List.Section title={query ? "In This Folder" : undefined}>{here.map((n) => item(n))}</List.Section>
      {query && index && (
        <List.Section
          title="In the Whole Drive"
          subtitle={
            index.partial
              ? `partial index · ${index.entries.length} items so far`
              : index.failedFolders?.length
                ? `${index.failedFolders.length} folder(s) could not be indexed · refresh to retry`
                : undefined
          }
        >
          {elsewhere.map((n) => item(n, true))}
        </List.Section>
      )}
      {query && !index && !progress && (
        <List.Section title="In the Whole Drive">
          <List.Item
            title="Build the search index to search everywhere"
            subtitle="Lists every folder once — several minutes on a large Drive"
            icon={Icon.MagnifyingGlass}
            actions={<ActionPanel>{indexActions}</ActionPanel>}
          />
        </List.Section>
      )}
    </List>
  );
}

function IndexActions(props: { hasIndex: boolean; onRefresh: () => void }) {
  return (
    <ActionPanel.Section title="Search Index">
      <Action
        title={props.hasIndex ? "Refresh Search Index" : "Build Search Index"}
        icon={Icon.ArrowClockwise}
        shortcut={{ modifiers: ["cmd", "shift"], key: "r" }}
        onAction={props.onRefresh}
      />
      <Action title="Open Extension Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
    </ActionPanel.Section>
  );
}
