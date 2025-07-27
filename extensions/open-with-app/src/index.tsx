import {
  ActionPanel,
  Action,
  getSelectedFinderItems,
  getApplications,
  FileSystemItem,
  Application,
  List,
  open,
  closeMainWindow,
  PopToRootType,
  popToRoot,
} from "@raycast/api";
import { useCachedPromise, useFrecencySorting, usePromise, runAppleScript, showFailureToast } from "@raycast/utils";
import { homedir } from "node:os";
import { useEffect, useState } from "react";

/**
 * Get selected items from Finder, even if Finder is not the frontmost
 * application. (Raycast's getSelectedFinderItems only works if Finder is the
 * frontmost application.)
 */
async function getBackgroundFinderItems(): Promise<FileSystemItem[]> {
  const paths = (await runAppleScript(`
    tell application "Finder"
      set selectedItems to selection
      set selectedPaths to {}
     
      repeat with selectedItem in selectedItems
        set selectedItemPath to POSIX path of (selectedItem as text)
        set end of selectedPaths to selectedItemPath
      end repeat
     
      return selectedPaths as list
    end tell
  `)) as string;
  if (paths.length === 0) return [];
  return paths.split(", ").map((path) => ({ path }));
}

/**
 * Get the extensions of the selected items.
 * Files without extensions are grouped under "file".
 */
function getExtensions(items: FileSystemItem[]) {
  const extensions = new Set<string>();
  for (const item of items) {
    const parts = item.path.split("/").at(-1)?.split(".");
    if (!parts || parts.length < 2) {
      extensions.add("file");
    } else {
      extensions.add(parts.at(-1)!);
    }
  }
  return Array.from(extensions).sort();
}

const home = homedir();
/**
 * Trim the path to make it more readable.
 */
function trimPath(path: string) {
  if (path.startsWith(home)) {
    path = "~" + path.slice(home.length);
  }
  const parts = path.split("/");
  if (parts.length > 4) {
    path = parts[0] + "/" + parts[1] + "/…/" + parts.at(-2) + "/" + parts.at(-1);
  }
  return path;
}

/**
 * Generate descriptive title that fits all the selected items.
 */
function makeTitle(items: FileSystemItem[]) {
  // empty selection
  if (items.length === 0) return "Open with…";
  // single item
  if (items.length === 1) return `Open ${trimPath(items[0].path)} with…`;

  const parent = items[0].path.split("/").slice(0, -1).join("/");
  const canUseParent = parent && items.every((item) => item.path.startsWith(parent));

  // all items have same extension
  const extensions = getExtensions(items);
  if (extensions.length === 1 && extensions[0] !== "file") {
    return `Open ${items.length} ${extensions[0]} files${canUseParent ? ` from ${trimPath(parent)}` : ""} with…`;
  }
  // all items have same parent directory
  if (canUseParent) {
    return `Open ${items.length} items from ${trimPath(parent)} with…`;
  }
  // fallback
  return `Open ${items.length} items with…`;
}

function ApplicationListItem({
  app,
  items,
  onAction,
}: {
  app: Application;
  items: FileSystemItem[];
  onAction?: (app: Application) => void;
}) {
  async function openAction() {
    await closeMainWindow({ clearRootSearch: true, popToRootType: PopToRootType.Suspended });
    onAction?.(app);
    await Promise.all(items.map((item) => open(item.path, app)));
    await popToRoot({ clearSearchBar: true });
  }
  return (
    <List.Item
      title={app.name}
      icon={{ fileIcon: app.path }}
      actions={
        <ActionPanel>
          <Action title={`Open with ${app.name}`} onAction={openAction} />
        </ActionPanel>
      }
    />
  );
}

export default function Command() {
  // get selected items from Finder
  const { data: items = [], isLoading: isLoadingSelection } = usePromise(() =>
    getSelectedFinderItems()
      .catch(getBackgroundFinderItems)
      .catch(() => void showFailureToast("Error getting Finder selection")),
  );

  // call getApplications for each selected item and return the intersection
  const { data: apps = [], isLoading: isLoadingApplications } = usePromise(
    async (items: FileSystemItem[]) => {
      if (items.length === 0) return [];
      const all = await Promise.all(items.map((item) => getApplications(item.path)));
      const common: Application[] = [];
      for (const app of all[0]) {
        if (all.every((apps) => apps.some((a) => a.path === app.path))) {
          common.push(app);
        }
      }
      return common;
    },
    [items],
    {
      execute: items.length > 0,
    },
  );

  // sort apps by frecency, scoped to selected items extensions so it remains relevant across uses
  const { data: sortedApps, visitItem: visitScope } = useFrecencySorting(apps, {
    key: (app) => app.bundleId || app.path,
    namespace: getExtensions(items).join(","),
  });

  // get all apps that are not in the intersection, sort by frecency
  const { data: allApps = [] } = useCachedPromise(getApplications, [], { keepPreviousData: true });
  const nonRecommendedApps = allApps.filter((app) => !apps.some((a) => a.path === app.path));
  const { data: sortedOtherApps, visitItem: visitAll } = useFrecencySorting(nonRecommendedApps, {
    key: (app) => app.bundleId || app.path,
  });

  const isLoading = isLoadingSelection || isLoadingApplications;

  const placeholder = !isLoading && items.length === 0 ? "No selected item in Finder..." : makeTitle(items);

  // implement custom filtering to support keeping the Recommended Apps section always on top of the Other Apps section
  const [searchText, setSearchText] = useState("");
  const [filteredRecommendedList, filterRecommendedList] = useState(sortedApps);
  const [filteredOtherList, filterOtherList] = useState(sortedOtherApps);

  useEffect(() => {
    if (isLoading) return;
    filterRecommendedList(sortedApps.filter((item) => item.name.toLowerCase().includes(searchText.toLowerCase())));
    filterOtherList(sortedOtherApps.filter((item) => item.name.toLowerCase().includes(searchText.toLowerCase())));
  }, [searchText, isLoading]);

  return (
    <List filtering={false} onSearchTextChange={setSearchText} isLoading={isLoading} searchBarPlaceholder={placeholder}>
      {items.length > 0 && !isLoading && filteredRecommendedList.length > 0 && (
        <List.Section title="Recommended Applications">
          {filteredRecommendedList.map((app) => (
            <ApplicationListItem key={app.path} app={app} items={items} onAction={visitScope} />
          ))}
        </List.Section>
      )}
      {items.length > 0 && !isLoading && filteredOtherList.length > 0 && (
        <List.Section title="Other Applications">
          {filteredOtherList.map((app) => (
            <ApplicationListItem key={app.path} app={app} items={items} onAction={visitAll} />
          ))}
        </List.Section>
      )}
    </List>
  );
}
