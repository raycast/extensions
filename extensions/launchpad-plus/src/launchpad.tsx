import {
  Action,
  ActionPanel,
  Application,
  getApplications,
  Icon,
  List,
  LocalStorage,
  showToast,
  Toast,
} from "@raycast/api";
import Fuse from "fuse.js";
import { useCallback, useEffect, useMemo, useState } from "react";
import { TagEditor } from "./components/tag-editor";
import { PAGE_SIZE, REFRESH_KEY, TAG_DEFINITIONS_KEY, TAG_ORDER_KEY } from "./constants";
import { generateId, loadStoredTags, TagEvents } from "./helpers";
import { AppTags, TagDefinitions } from "./types";

/* -------------------------------------------------------------------------- */
/*                                Root Command                                */
/* -------------------------------------------------------------------------- */

export default function Command() {
  const [allApps, setAllApps] = useState<Application[]>([]);
  const [tags, setTags] = useState<AppTags>({});
  const [tagDefinitions, setTagDefinitions] = useState<TagDefinitions>({});
  const [tagOrder, setTagOrder] = useState<string[]>([]);
  const [searchText, setSearchText] = useState("");
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [isLoading, setIsLoading] = useState(true);

  /* ---------------------------------------------------------------------- */
  /*              🚀 1. Load cached data immediately (no delay)              */
  /* ---------------------------------------------------------------------- */
  useEffect(() => {
    (async () => {
      const { tags, tagDefinitions, tagOrder } = await loadStoredTags();
      setTags(tags);
      setTagDefinitions(tagDefinitions);
      setTagOrder(tagOrder);
    })();
  }, []);

  /* ---------------------------------------------------------------------- */
  /*              🚀 2. Async refresh (apps and latest data)                */
  /* ---------------------------------------------------------------------- */
  const loadData = useCallback(async () => {
    const installedApps = await getApplications();
    installedApps.sort((a, b) => a.name.localeCompare(b.name));

    const { tags, tagDefinitions, tagOrder } = await loadStoredTags();
    setAllApps(installedApps);
    setTags(tags);
    setTagDefinitions(tagDefinitions);
    setTagOrder(tagOrder);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  /* ---------------------------------------------------------------------- */
  /*                         Persistence helpers                            */
  /* ---------------------------------------------------------------------- */
  async function persistRefreshVersion() {
    await LocalStorage.setItem(REFRESH_KEY, Date.now().toString());
  }

  async function persistTagOrder(order: string[]) {
    setTagOrder(order);
    await LocalStorage.setItem(TAG_ORDER_KEY, JSON.stringify(order));
  }

  /* ---------------------------------------------------------------------- */
  /*                         CRUD Tag Operations                             */
  /* ---------------------------------------------------------------------- */
  async function saveTags(bundleIdOrPath: string, tagList: string[]) {
    const newTags = { ...tags, [bundleIdOrPath]: tagList };
    setTags(newTags);
    await LocalStorage.setItem(bundleIdOrPath, JSON.stringify(tagList));
    await persistRefreshVersion();
    TagEvents.emit("tagsUpdated");
  }

  async function createTag(name: string, color: string) {
    const id = generateId();
    const defsStr = await LocalStorage.getItem<string>(TAG_DEFINITIONS_KEY);
    const defs: TagDefinitions = defsStr ? JSON.parse(defsStr) : {};
    defs[id] = { id, name, color };
    await LocalStorage.setItem(TAG_DEFINITIONS_KEY, JSON.stringify(defs));
    setTagDefinitions(defs);

    const orderStr = await LocalStorage.getItem<string>(TAG_ORDER_KEY);
    let order: string[] = orderStr ? JSON.parse(orderStr) : [];
    order = [...order, id];
    await persistTagOrder(order);

    await persistRefreshVersion();
    TagEvents.emit("tagsUpdated");
    await showToast(Toast.Style.Success, "Tag Created", `Added ${name}`);
  }

  async function editTag(id: string, newName: string, newColor: string) {
    const defsStr = await LocalStorage.getItem<string>(TAG_DEFINITIONS_KEY);
    const defs: TagDefinitions = defsStr ? JSON.parse(defsStr) : {};
    if (!defs[id]) return;
    defs[id] = { id, name: newName, color: newColor };
    await LocalStorage.setItem(TAG_DEFINITIONS_KEY, JSON.stringify(defs));
    setTagDefinitions(defs);
    await persistRefreshVersion();
    TagEvents.emit("tagsUpdated");
    await showToast(Toast.Style.Success, "Tag Updated", `Updated ${newName}`);
  }

  async function deleteTag(id: string) {
    const defsStr = await LocalStorage.getItem<string>(TAG_DEFINITIONS_KEY);
    const defs: TagDefinitions = defsStr ? JSON.parse(defsStr) : {};
    delete defs[id];
    const updatedTags: AppTags = { ...tags };
    for (const key in updatedTags) {
      const current = updatedTags[key];
      if (Array.isArray(current)) {
        updatedTags[key] = current.filter((tagId) => tagId !== id);
        await LocalStorage.setItem(key, JSON.stringify(updatedTags[key]));
      }
    }
    setTags(updatedTags);
    const orderStr = await LocalStorage.getItem<string>(TAG_ORDER_KEY);
    let order: string[] = orderStr ? JSON.parse(orderStr) : [];
    order = order.filter((tagId) => tagId !== id);
    await persistTagOrder(order);
    await LocalStorage.setItem(TAG_DEFINITIONS_KEY, JSON.stringify(defs));
    setTagDefinitions(defs);
    await persistRefreshVersion();
    TagEvents.emit("tagsUpdated");
    await showToast(Toast.Style.Success, "Tag Deleted", "Tag removed successfully");
  }

  /* ---------------------------------------------------------------------- */
  /*                             Search + Paging                            */
  /* ---------------------------------------------------------------------- */
  const fuse = useMemo(() => new Fuse(allApps, { keys: ["name"], threshold: 0.4 }), [allApps]);
  const filteredApps = useMemo(() => {
    if (!searchText) return allApps;
    if (searchText.startsWith("#")) {
      const q = searchText.slice(1).toLowerCase();
      return allApps.filter((a) => {
        const appTagIds = tags[a.bundleId ?? a.path] ?? [];
        return appTagIds.some((id) => tagDefinitions[id]?.name.toLowerCase().includes(q));
      });
    }
    return fuse.search(searchText).map((r) => r.item);
  }, [allApps, fuse, searchText, tags, tagDefinitions]);

  const visibleApps = filteredApps.slice(0, visibleCount);
  useEffect(() => setVisibleCount(PAGE_SIZE), [searchText]);

  /* ---------------------------------------------------------------------- */
  /*                               Render                                   */
  /* ---------------------------------------------------------------------- */
  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search apps or #tag..."
      onSearchTextChange={setSearchText}
      onSelectionChange={(id) => {
        if (!id) return;
        const index = visibleApps.findIndex((a) => a.path === id);
        if (index >= visibleApps.length - 5 && visibleCount < filteredApps.length) {
          setVisibleCount((v) => v + PAGE_SIZE);
        }
      }}
      throttle
    >
      {visibleApps.map((app) => {
        const appTagIds = tags[app.bundleId ?? app.path] ?? [];
        const accessories = appTagIds
          .map((id) => tagDefinitions[id])
          .filter(Boolean)
          .map((def) => ({ tag: { value: def!.name, color: def!.color, tooltip: def!.name } }));

        return (
          <List.Item
            id={app.path}
            key={app.path}
            title={app.name}
            icon={{ fileIcon: app.path }}
            accessories={accessories}
            actions={
              <ActionPanel>
                <Action.Open title="Open App" target={app.path} />
                <Action.Push
                  title="Edit Tags"
                  icon={Icon.Tag}
                  target={
                    <TagEditor
                      app={app}
                      onSave={(newTags) => saveTags(app.bundleId ?? app.path, newTags)}
                      onCreateGlobal={createTag}
                      onEditGlobal={editTag}
                      onDeleteGlobal={deleteTag}
                      tagOrder={tagOrder}
                    />
                  }
                />
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}
