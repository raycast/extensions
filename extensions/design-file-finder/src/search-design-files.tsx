import { useEffect, useMemo, useState } from "react";
import {
  Action,
  ActionPanel,
  Color,
  Form,
  Icon,
  List,
  getPreferenceValues,
  useNavigation,
  Keyboard,
} from "@raycast/api";
import { useCachedPromise, showFailureToast } from "@raycast/utils";
import { ALL_EXTENSIONS } from "./lib/extensions";
import { scanAll, isAutoSavePath } from "./lib/scan";
import { listDrives } from "./lib/drives";
import { foldersToRoots } from "./lib/roots";
import {
  loadEnabledDrives,
  saveEnabledDrives,
  loadSort,
  saveSort,
  loadSearchFolders,
  saveSearchFolders,
} from "./lib/prefs";
import { recencyMs, sortRecords } from "./lib/recency";
import { formatRelativeTime, formatSize, parentFolderName } from "./lib/format";
import { AppFilter, AppKind, Drive, FileRecord, SortKey } from "./lib/types";

/** Display name (last path segment) of a folder path. */
function folderName(path: string): string {
  const trimmed = path.replace(/\/+$/, "");
  const slash = trimmed.lastIndexOf("/");
  return slash >= 0 ? trimmed.slice(slash + 1) || "/" : trimmed;
}

/** Every lowercased token of the query must appear in the filename or folder. */
function matchesQuery(r: FileRecord, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const hay = `${r.name} ${r.folder}`.toLowerCase();
  return q.split(/\s+/).every((token) => hay.includes(token));
}

const APP_META: Record<AppKind, { label: string; icon: Icon; color: Color }> = {
  premiere: { label: "Premiere", icon: Icon.Video, color: Color.Purple },
  aftereffects: { label: "After Effects", icon: Icon.Stars, color: Color.Magenta },
  photoshop: { label: "Photoshop", icon: Icon.Image, color: Color.Blue },
  illustrator: { label: "Illustrator", icon: Icon.Brush, color: Color.Orange },
};

const SORTS: { key: SortKey; label: string }[] = [
  { key: "recent", label: "Recently Used" },
  { key: "name", label: "Name" },
  { key: "folder", label: "Folder" },
  { key: "type", label: "Type" },
];

const APP_FILTERS: { key: AppFilter; label: string }[] = [
  { key: "all", label: "All Apps" },
  { key: "premiere", label: "Premiere" },
  { key: "photoshop", label: "Photoshop" },
  { key: "illustrator", label: "Illustrator" },
  { key: "aftereffects", label: "After Effects" },
];

export default function Command() {
  const { enrichRecency, hideAutoSaves } = getPreferenceValues<Preferences.SearchDesignFiles>();
  const [drives, setDrives] = useState<Drive[]>([]);
  const [enabled, setEnabled] = useState<Set<string>>(new Set());
  const [bootstrapped, setBootstrapped] = useState(false);
  const [sort, setSort] = useState<SortKey>("recent");
  const [appFilter, setAppFilter] = useState<AppFilter>("all");
  const [searchText, setSearchText] = useState("");
  const [folders, setFolders] = useState<string[]>([]);

  // Load drives, persisted enabled set, sort, and search folders once.
  useEffect(() => {
    (async () => {
      try {
        const found = await listDrives();
        setDrives(found);
        setEnabled(await loadEnabledDrives(found));
        setSort(await loadSort());
        setFolders(await loadSearchFolders());
      } catch (error) {
        await showFailureToast(error, { title: "Could not read drives" });
      } finally {
        setBootstrapped(true);
      }
    })();
  }, []);

  // Scope: if the user picked folders, search only those; otherwise the enabled drives.
  const folderMode = folders.length > 0;
  const scopeKey = useMemo(
    () => (folderMode ? `folders:${[...folders].sort().join("|")}` : `drives:${[...enabled].sort().join("|")}`),
    [folderMode, folders, enabled],
  );

  const { data, isLoading, revalidate } = useCachedPromise(
    async (_key: string, enrich: boolean) => {
      const roots = folderMode ? foldersToRoots(folders, drives) : drives.filter((d) => enabled.has(d.path));
      const outcome = await scanAll(roots, ALL_EXTENSIONS, { enrichRecency: enrich });
      return { ...outcome, scannedAtMs: Date.now() };
    },
    [scopeKey, enrichRecency],
    {
      execute: bootstrapped && drives.length > 0 && (folderMode || enabled.size > 0),
      keepPreviousData: true,
      initialData: { records: [] as FileRecord[], scannedAtMs: 0 },
      onError: (error) => {
        showFailureToast(error, { title: "Scan failed" });
      },
    },
  );

  const records = data?.records ?? [];
  const now = Date.now();

  // We own filtering (filtering={false} on the List) so the chosen sort order
  // survives once the user starts typing — Raycast's built-in filter would re-rank.
  const visible = useMemo(() => {
    const base = records.filter(
      (r) =>
        (appFilter === "all" || r.app === appFilter) &&
        (!hideAutoSaves || !isAutoSavePath(r.path)) &&
        matchesQuery(r, searchText),
    );
    return sortRecords(base, sort);
  }, [records, appFilter, sort, searchText, hideAutoSaves]);

  async function changeSort(next: SortKey) {
    setSort(next);
    await saveSort(next);
  }

  function onDrivesChanged(next: Set<string>) {
    setEnabled(new Set(next));
  }

  function onFoldersChanged(next: string[]) {
    setFolders([...next]);
  }

  const globalActions = (
    <ActionPanel.Section>
      <ActionPanel.Submenu title="Sort by…" icon={Icon.BarChart} shortcut={Keyboard.Shortcut.Common.Duplicate}>
        {SORTS.map((s) => (
          <Action
            key={s.key}
            title={s.label}
            icon={sort === s.key ? Icon.Check : Icon.Circle}
            onAction={() => changeSort(s.key)}
          />
        ))}
      </ActionPanel.Submenu>
      <Action.Push
        title="Search Specific Folders"
        icon={Icon.Folder}
        shortcut={{ modifiers: ["cmd"], key: "f" }}
        target={<FolderPicker folders={folders} onChange={onFoldersChanged} />}
      />
      <Action.Push
        title="Configure Drives"
        icon={Icon.HardDrive}
        shortcut={{ modifiers: ["cmd"], key: "d" }}
        target={<DrivePicker drives={drives} enabled={enabled} onChange={onDrivesChanged} />}
      />
      <Action
        title="Refresh Index"
        icon={Icon.ArrowClockwise}
        shortcut={Keyboard.Shortcut.Common.Refresh}
        onAction={() => revalidate()}
      />
    </ActionPanel.Section>
  );

  return (
    <List
      isLoading={!bootstrapped || isLoading}
      filtering={false}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search by filename or folder…"
      searchBarAccessory={
        <List.Dropdown tooltip="Filter by app" value={appFilter} onChange={(v) => setAppFilter(v as AppFilter)}>
          {APP_FILTERS.map((f) => (
            <List.Dropdown.Item key={f.key} title={f.label} value={f.key} />
          ))}
        </List.Dropdown>
      }
    >
      {!folderMode && enabled.size === 0 ? (
        <List.EmptyView
          icon={Icon.HardDrive}
          title="Nothing to search yet"
          description="Pick specific work folders (⌘F) or enable drives (⌘D)."
          actions={
            <ActionPanel>
              <Action.Push
                title="Search Specific Folders"
                icon={Icon.Folder}
                target={<FolderPicker folders={folders} onChange={onFoldersChanged} />}
              />
              <Action.Push
                title="Configure Drives"
                icon={Icon.HardDrive}
                target={<DrivePicker drives={drives} enabled={enabled} onChange={onDrivesChanged} />}
              />
            </ActionPanel>
          }
        />
      ) : visible.length === 0 && !isLoading ? (
        <List.EmptyView
          icon={Icon.MagnifyingGlass}
          title="No files found"
          description={
            folderMode
              ? "Add more folders (⌘F) or refresh (⌘R)."
              : "Narrow to your work folders (⌘F), enable drives (⌘D), or refresh (⌘R)."
          }
          actions={<ActionPanel>{globalActions}</ActionPanel>}
        />
      ) : (
        visible.map((r) => {
          const meta = APP_META[r.app];
          const ts = recencyMs(r);
          return (
            <List.Item
              key={r.path}
              title={r.name}
              subtitle={parentFolderName(r.path)}
              icon={{ source: meta.icon, tintColor: meta.color }}
              accessories={[
                { tag: { value: meta.label, color: meta.color } },
                {
                  text: formatRelativeTime(ts, now),
                  tooltip: `${new Date(ts).toLocaleString()}${
                    r.sizeBytes != null ? ` · ${formatSize(r.sizeBytes)}` : ""
                  }`,
                },
              ]}
              actions={
                <ActionPanel>
                  <ActionPanel.Section>
                    <Action.Open title="Open" target={r.path} icon={meta.icon} />
                    <Action.ShowInFinder path={r.path} shortcut={{ modifiers: ["cmd"], key: "return" }} />
                    <Action.OpenWith path={r.path} shortcut={Keyboard.Shortcut.Common.Open} />
                    <Action.CopyToClipboard
                      title="Copy Path"
                      content={r.path}
                      shortcut={Keyboard.Shortcut.Common.CopyPath}
                    />
                  </ActionPanel.Section>
                  {globalActions}
                </ActionPanel>
              }
            />
          );
        })
      )}
    </List>
  );
}

function DrivePicker(props: { drives: Drive[]; enabled: Set<string>; onChange: (next: Set<string>) => void }) {
  const [local, setLocal] = useState<Set<string>>(new Set(props.enabled));

  async function toggle(path: string) {
    const next = new Set(local);
    if (next.has(path)) next.delete(path);
    else next.add(path);
    setLocal(next);
    await saveEnabledDrives(next);
    props.onChange(next);
  }

  return (
    <List navigationTitle="Configure Drives" searchBarPlaceholder="Toggle drives to search…">
      {props.drives.map((d) => {
        const on = local.has(d.path);
        const scanTag = d.indexed
          ? { value: "Spotlight", color: Color.Green }
          : { value: d.isRoot ? "Walk · home" : "Walk", color: Color.Yellow };
        return (
          <List.Item
            key={d.path}
            title={d.name}
            subtitle={d.path}
            icon={{
              source: on ? Icon.CheckCircle : Icon.Circle,
              tintColor: on ? Color.Green : Color.SecondaryText,
            }}
            accessories={[{ tag: scanTag }]}
            actions={
              <ActionPanel>
                <Action
                  title={on ? "Disable Drive" : "Enable Drive"}
                  icon={on ? Icon.Circle : Icon.CheckCircle}
                  onAction={() => toggle(d.path)}
                />
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}

function FolderPicker(props: { folders: string[]; onChange: (next: string[]) => void }) {
  const [local, setLocal] = useState<string[]>([...props.folders]);

  async function persist(next: string[]) {
    setLocal(next);
    await saveSearchFolders(next);
    props.onChange(next);
  }
  function remove(path: string) {
    return persist(local.filter((f) => f !== path));
  }
  function add(paths: string[]) {
    return persist(Array.from(new Set([...local, ...paths])));
  }

  const addAction = (
    <Action.Push
      title="Add Folder"
      icon={Icon.Plus}
      shortcut={Keyboard.Shortcut.Common.New}
      target={<AddFolderForm onAdd={add} />}
    />
  );

  return (
    <List
      navigationTitle="Search Specific Folders"
      searchBarPlaceholder="Folders where your work lives…"
      actions={<ActionPanel>{addAction}</ActionPanel>}
    >
      {local.length === 0 ? (
        <List.EmptyView
          icon={Icon.Folder}
          title="No folders chosen"
          description="Add the folders where your real projects live — search scopes to just these. Leave empty to search whole drives instead."
          actions={<ActionPanel>{addAction}</ActionPanel>}
        />
      ) : (
        local.map((f) => (
          <List.Item
            key={f}
            icon={Icon.Folder}
            title={folderName(f)}
            subtitle={f}
            actions={
              <ActionPanel>
                {addAction}
                <Action
                  title="Remove Folder"
                  icon={Icon.Trash}
                  style={Action.Style.Destructive}
                  shortcut={Keyboard.Shortcut.Common.Remove}
                  onAction={() => remove(f)}
                />
              </ActionPanel>
            }
          />
        ))
      )}
    </List>
  );
}

function AddFolderForm(props: { onAdd: (paths: string[]) => void }) {
  const { pop } = useNavigation();

  function submit(values: { folders: string[] }) {
    const picked = values.folders ?? [];
    if (picked.length > 0) props.onAdd(picked);
    pop();
  }

  return (
    <Form
      navigationTitle="Add Folders"
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Add Folders" icon={Icon.Plus} onSubmit={submit} />
        </ActionPanel>
      }
    >
      <Form.FilePicker
        id="folders"
        title="Folders"
        allowMultipleSelection
        canChooseDirectories
        canChooseFiles={false}
      />
      <Form.Description text="Pick one or more folders where your actual projects live. Search scopes to just these — no preset-pack noise." />
    </Form>
  );
}
