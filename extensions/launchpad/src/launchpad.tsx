import {
  Action,
  ActionPanel,
  Form,
  Grid,
  Icon,
  Image,
  open,
  showHUD,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { useEffect, useRef, useState } from "react";
import { AppEntry, Folder, LaunchpadConfig } from "./types";
import {
  firstRunLoadConfig,
  loadCachedConfig,
  saveConfig,
  syncWithSystem,
} from "./storage";
import { FolderGrid } from "./FolderGrid";
import { buildFolderIcon, buildFolderIconSync, getCachedFolderIcon } from "./folderIcon";
import crypto from "crypto";

export type Mode = "app" | "multi";

// "X apps" / "1 app"
export function pluralizeApps(n: number): string {
  return n === 1 ? "1 app" : `${n} apps`;
}

// Build the full folder→icon-path map synchronously. Empty folders are
// omitted, so callers replacing the whole map will naturally drop entries
// for folders that just lost their last app (renders fall back to Icon.Folder).
function computeFolderIconsSync(folders: Folder[]): Record<string, string> {
  const icons: Record<string, string> = {};
  for (const folder of folders) {
    if (folder.apps.length === 0) continue;
    const paths = folder.apps.slice(0, 9).map((a) => a.path);
    const cached = getCachedFolderIcon(folder.id, paths);
    if (cached) {
      icons[folder.id] = cached;
      continue;
    }
    const built = buildFolderIconSync(folder.id, paths);
    if (built) icons[folder.id] = built;
  }
  return icons;
}

export default function Launchpad() {
  const [config, setConfig] = useState<LaunchpadConfig | null>(null);
  const [mode, setMode] = useState<Mode>("app");
  // selectedBundleIds is the bulk-select set used in Multi-Move mode.
  // Constraint: a single selection set is scoped to one bucket — either the
  // uncategorized bucket or one specific folder. Switching scope clears it.
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [folderIcons, setFolderIcons] = useState<Record<string, string>>({});
  // Async icon-build only runs during the first paint cycle. Subsequent
  // user mutations stay synchronous — they fall back to whatever's already
  // cached, no shell-out, no flicker.
  const initialIconBuildDone = useRef(false);
  const { push } = useNavigation();

  // Two-phase load: render the cached config immediately (no subprocess
  // calls), then sync with the system in the background. The user sees
  // their folders within ~10ms of opening; install/uninstall changes
  // surface a moment later when sync resolves.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const cached = await loadCachedConfig();
      if (cancelled) return;

      if (cached) {
        // Phase 1: paint the cached state immediately
        setConfig(cached);
        // Phase 2: refresh names/paths and detect new installs in the background
        const synced = await syncWithSystem(cached);
        if (!cancelled) setConfig(synced);
      } else {
        // First-ever launch: nothing to render until we import
        const fresh = await firstRunLoadConfig();
        if (!cancelled) setConfig(fresh);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Folder icons:
  //   - On every config change, do a SYNCHRONOUS cache lookup so any already-
  //     built composite icons paint immediately.
  //   - On the FIRST run only, kick off async builds for missing icons. After
  //     that, mutations rely on whatever's cached on disk; the missing case
  //     falls back to the first app's fileIcon. Async work after a user move
  //     would cause a re-render flicker, which feels bad.
  useEffect(() => {
    if (!config) return;
    const pending = config.folders.filter((f) => f.apps.length > 0);

    // 1. Synchronous pass: harvest already-cached icons. REPLACE the whole
    //    map (don't merge) so stale entries drop out — e.g. a folder whose
    //    only app was uninstalled now has 0 apps and shouldn't keep showing
    //    the old composite icon.
    const synced: Record<string, string> = {};
    for (const folder of pending) {
      const appPaths = folder.apps.slice(0, 9).map((a) => a.path);
      const cached = getCachedFolderIcon(folder.id, appPaths);
      if (cached) synced[folder.id] = cached;
    }
    setFolderIcons(synced);

    // 2. Async pass — first paint only. Avoids re-rendering folder cells
    //    while the user is moving apps around.
    if (pending.length === 0) return;
    if (initialIconBuildDone.current) return;
    initialIconBuildDone.current = true;

    const missing = pending.filter((f) => !synced[f.id]);
    if (missing.length === 0) return;

    let cancelled = false;
    (async () => {
      const results = await Promise.all(
        missing.map(async (folder) => {
          const appPaths = folder.apps.slice(0, 9).map((a) => a.path);
          const iconPath = await buildFolderIcon(folder.id, appPaths);
          return [folder.id, iconPath] as const;
        })
      );
      if (cancelled) return;
      const merged: Record<string, string> = {};
      for (const [id, p] of results) if (p) merged[id] = p;
      if (Object.keys(merged).length > 0) {
        setFolderIcons((prev) => ({ ...prev, ...merged }));
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [config?.folders.map((f) => f.id + ":" + f.apps.map((a) => a.bundleId).join(",")).join("|")]);

  if (!config) return <Grid isLoading />;

  function persistConfig(next: LaunchpadConfig) {
    saveConfig(next).catch(() =>
      showToast({ style: Toast.Style.Failure, title: "Failed to save — changes will be lost on restart" })
    );
  }

  function update(next: LaunchpadConfig) {
    setConfig(next);
    persistConfig(next);
    // Sync rebuild so the folder icon never lags behind the config. Replaces
    // the whole map, so folders that just emptied lose their stale composite
    // and fall back to Icon.Folder on the next render.
    setFolderIcons(computeFolderIconsSync(next.folders));
  }

  // ── Folder mutations ────────────────────────────────────────────────────

  function createFolder(name: string): Folder {
    const folder: Folder = { id: crypto.randomUUID(), name, apps: [] };
    update({ ...config!, folders: [...config!.folders, folder] });
    return folder;
  }

  function renameFolder(folderId: string, name: string) {
    update({
      ...config!,
      folders: config!.folders.map((f) => (f.id === folderId ? { ...f, name } : f)),
    });
  }

  function deleteFolder(folder: Folder) {
    update({
      ...config!,
      folders: config!.folders.filter((f) => f.id !== folder.id),
      uncategorized: [...folder.apps, ...config!.uncategorized],
    });
  }

  // Folders flow left-to-right in the grid, so "left" = earlier in the array,
  // "right" = later. Naming the actions Left/Right matches what the user
  // visually sees in the grid.
  function moveFolderLeft(folderId: string) {
    setConfig((prev) => {
      if (!prev) return prev;
      const idx = prev.folders.findIndex((f) => f.id === folderId);
      if (idx <= 0) return prev;
      const folders = [...prev.folders];
      [folders[idx - 1], folders[idx]] = [folders[idx], folders[idx - 1]];
      const next = { ...prev, folders };
      persistConfig(next);
      return next;
    });
  }

  function moveFolderRight(folderId: string) {
    setConfig((prev) => {
      if (!prev) return prev;
      const idx = prev.folders.findIndex((f) => f.id === folderId);
      if (idx < 0 || idx >= prev.folders.length - 1) return prev;
      const folders = [...prev.folders];
      [folders[idx], folders[idx + 1]] = [folders[idx + 1], folders[idx]];
      const next = { ...prev, folders };
      persistConfig(next);
      return next;
    });
  }

  // ── App mutations ───────────────────────────────────────────────────────

  async function launch(app: AppEntry) {
    try {
      await open(app.path);
      await showHUD(`Opened ${app.name}`);
    } catch {
      await showToast({ style: Toast.Style.Failure, title: `Failed to open ${app.name}` });
    }
  }

  function moveAppToFolder(app: AppEntry, targetFolderId: string) {
    update({
      ...config!,
      uncategorized: config!.uncategorized.filter((a) => a.bundleId !== app.bundleId),
      folders: config!.folders.map((f) =>
        f.id === targetFolderId ? { ...f, apps: [...f.apps, app] } : f
      ),
    });
  }

  function hideApp(app: AppEntry) {
    update({
      ...config!,
      uncategorized: config!.uncategorized.filter((a) => a.bundleId !== app.bundleId),
      hidden: [...config!.hidden, app],
    });
  }

  function unhideAll() {
    update({
      ...config!,
      uncategorized: [...config!.hidden, ...config!.uncategorized],
      hidden: [],
    });
  }

  // Reorder an uncategorized app within the uncategorized bucket. Apps flow
  // left-to-right just like folders, so "left" / "right" match the visual
  // direction in the grid.
  function moveUncategorizedAppLeft(bundleId: string) {
    setConfig((prev) => {
      if (!prev) return prev;
      const idx = prev.uncategorized.findIndex((a) => a.bundleId === bundleId);
      if (idx <= 0) return prev;
      const apps = [...prev.uncategorized];
      [apps[idx - 1], apps[idx]] = [apps[idx], apps[idx - 1]];
      const next = { ...prev, uncategorized: apps };
      persistConfig(next);
      return next;
    });
  }

  function moveUncategorizedAppRight(bundleId: string) {
    setConfig((prev) => {
      if (!prev) return prev;
      const idx = prev.uncategorized.findIndex((a) => a.bundleId === bundleId);
      if (idx < 0 || idx >= prev.uncategorized.length - 1) return prev;
      const apps = [...prev.uncategorized];
      [apps[idx], apps[idx + 1]] = [apps[idx + 1], apps[idx]];
      const next = { ...prev, uncategorized: apps };
      persistConfig(next);
      return next;
    });
  }

  // ── Multi-Move helpers (top-level / uncategorized scope) ─────────────────

  function toggleSelect(bundleId: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(bundleId) ? next.delete(bundleId) : next.add(bundleId);
      return next;
    });
  }

  function selectAllUncategorized() {
    setSelected(new Set(config!.uncategorized.map((a) => a.bundleId)));
  }

  function clearSelection() {
    setSelected(new Set());
  }

  function moveSelectedFromUncategorizedTo(targetFolderId: string) {
    const selectedApps = config!.uncategorized.filter((a) => selected.has(a.bundleId));
    if (selectedApps.length === 0) return;
    update({
      ...config!,
      uncategorized: config!.uncategorized.filter((a) => !selected.has(a.bundleId)),
      folders: config!.folders.map((f) =>
        f.id === targetFolderId ? { ...f, apps: [...f.apps, ...selectedApps] } : f
      ),
    });
    clearSelection();
  }

  function moveSelectedFromUncategorizedToNewFolder(name: string) {
    const selectedApps = config!.uncategorized.filter((a) => selected.has(a.bundleId));
    if (selectedApps.length === 0) return;
    const folder: Folder = { id: crypto.randomUUID(), name, apps: selectedApps };
    update({
      ...config!,
      uncategorized: config!.uncategorized.filter((a) => !selected.has(a.bundleId)),
      folders: [...config!.folders, folder],
    });
    clearSelection();
  }

  // ── Folder icon ──────────────────────────────────────────────────────────

  function folderContent(folder: Folder): Image.ImageLike {
    if (folderIcons[folder.id]) return { source: folderIcons[folder.id] };
    if (folder.apps.length > 0) return { fileIcon: folder.apps[0].path };
    return Icon.Folder;
  }

  // ── Render ───────────────────────────────────────────────────────────────

  const isMulti = mode === "multi";
  const selectionCount = selected.size;

  return (
    <Grid
      columns={8}
      inset={Grid.Inset.Small}
      navigationTitle={
        isMulti
          ? `Multi-Move${selectionCount > 0 ? ` — ${selectionCount} selected` : ""}`
          : "Launchpad"
      }
      searchBarPlaceholder={isMulti ? "Select apps to bulk-move…" : "Search apps…"}
      searchBarAccessory={
        <Grid.Dropdown
          tooltip="Mode"
          value={mode}
          onChange={(v) => {
            const newMode = v as Mode;
            if (newMode !== mode) clearSelection();
            setMode(newMode);
          }}
        >
          <Grid.Dropdown.Item title="Apps" value="app" />
          <Grid.Dropdown.Item title="Multi-Move" value="multi" />
        </Grid.Dropdown>
      }
    >
      {/* Folders */}
      {config.folders.length > 0 && (
        <Grid.Section title="Folders">
          {config.folders.map((folder) => (
            <Grid.Item
              key={folder.id}
              title={folder.name}
              content={folderContent(folder)}
              subtitle={pluralizeApps(folder.apps.length)}
              actions={
                <ActionPanel>
                  {isMulti ? (
                    // In Multi-Move, a folder is a navigation target — entering
                    // it switches the selection scope to that folder's apps.
                    <Action
                      title="Open Folder"
                      onAction={() => {
                        clearSelection();
                        push(
                          <FolderGrid
                            folderId={folder.id}
                            config={config}
                            mode="multi"
                            onConfigChange={update}
                          />
                        );
                      }}
                    />
                  ) : (
                    <>
                      <Action
                        title="Open Folder"
                        onAction={() =>
                          push(
                            <FolderGrid
                              folderId={folder.id}
                              config={config}
                              mode="app"
                              onConfigChange={update}
                            />
                          )
                        }
                      />
                      <Action
                        title="Rename Folder"
                        icon={Icon.Pencil}
                        shortcut={{ modifiers: ["cmd"], key: "r" }}
                        onAction={() =>
                          push(
                            <RenameFolderForm
                              folder={folder}
                              onRename={(name) => renameFolder(folder.id, name)}
                            />
                          )
                        }
                      />
                      <Action
                        title="Move Folder Left"
                        icon={Icon.ArrowLeft}
                        shortcut={{ modifiers: ["opt", "shift"], key: "arrowLeft" }}
                        onAction={() => moveFolderLeft(folder.id)}
                      />
                      <Action
                        title="Move Folder Right"
                        icon={Icon.ArrowRight}
                        shortcut={{ modifiers: ["opt", "shift"], key: "arrowRight" }}
                        onAction={() => moveFolderRight(folder.id)}
                      />
                      <Action
                        title="Delete Folder"
                        icon={Icon.Trash}
                        style={Action.Style.Destructive}
                        shortcut={{ modifiers: ["ctrl"], key: "x" }}
                        onAction={() => deleteFolder(folder)}
                      />
                      <Action
                        title="Create New Folder"
                        icon={Icon.NewFolder}
                        shortcut={{ modifiers: ["cmd"], key: "n" }}
                        onAction={() =>
                          push(
                            <CreateFolderForm
                              onCreate={(name) => {
                                createFolder(name);
                              }}
                            />
                          )
                        }
                      />
                    </>
                  )}
                </ActionPanel>
              }
            />
          ))}
        </Grid.Section>
      )}

      {/* Uncategorized apps */}
      {config.uncategorized.length > 0 && (
        <Grid.Section title="Apps">
          {config.uncategorized.map((app) => {
            const isSelected = selected.has(app.bundleId);
            return (
              <Grid.Item
                key={app.bundleId}
                title={app.name}
                content={{ fileIcon: app.path }}
                subtitle={isMulti && isSelected ? "✓ selected" : undefined}
                actions={
                  <ActionPanel>
                    {isMulti ? (
                      <>
                        <Action
                          title={isSelected ? "Deselect" : "Select"}
                          icon={Icon.CheckList}
                          onAction={() => toggleSelect(app.bundleId)}
                        />
                        {/* Position #2 — Raycast auto-assigns ⌘↵ */}
                        <Action
                          title="Done"
                          icon={Icon.Checkmark}
                          onAction={() => {
                            clearSelection();
                            setMode("app");
                          }}
                        />
                        <Action
                          title="Select All"
                          icon={Icon.CheckList}
                          onAction={selectAllUncategorized}
                        />
                        <Action
                          title="Deselect All"
                          icon={Icon.XMarkCircle}
                          onAction={clearSelection}
                        />
                        {selectionCount > 0 && (
                          <MoveSelectedToFolderAction
                            count={selectionCount}
                            config={config}
                            onMove={moveSelectedFromUncategorizedTo}
                          />
                        )}
                        {selectionCount > 0 && (
                          <Action
                            title={`Move ${selectionCount} ${selectionCount === 1 ? "App" : "Apps"} to New Folder…`}
                            icon={Icon.NewFolder}
                            shortcut={{ modifiers: ["cmd"], key: "n" }}
                            onAction={() =>
                              push(
                                <CreateFolderForm
                                  onCreate={(name) =>
                                    moveSelectedFromUncategorizedToNewFolder(name)
                                  }
                                />
                              )
                            }
                          />
                        )}
                      </>
                    ) : (
                      <>
                        <Action title="Open" onAction={() => launch(app)} />
                        <MoveToFolderAction
                          config={config}
                          onMove={(folderId) => moveAppToFolder(app, folderId)}
                        />
                        <Action
                          title="Move App Left"
                          icon={Icon.ArrowLeft}
                          shortcut={{ modifiers: ["opt", "shift"], key: "arrowLeft" }}
                          onAction={() => moveUncategorizedAppLeft(app.bundleId)}
                        />
                        <Action
                          title="Move App Right"
                          icon={Icon.ArrowRight}
                          shortcut={{ modifiers: ["opt", "shift"], key: "arrowRight" }}
                          onAction={() => moveUncategorizedAppRight(app.bundleId)}
                        />
                        <Action
                          title="Hide App"
                          icon={Icon.EyeDisabled}
                          style={Action.Style.Destructive}
                          onAction={() => hideApp(app)}
                        />
                        <Action
                          title="Create New Folder"
                          icon={Icon.NewFolder}
                          shortcut={{ modifiers: ["cmd"], key: "n" }}
                          onAction={() =>
                            push(
                              <CreateFolderForm
                                onCreate={(name) => {
                                  createFolder(name);
                                }}
                              />
                            )
                          }
                        />
                      </>
                    )}
                  </ActionPanel>
                }
              />
            );
          })}
        </Grid.Section>
      )}

      {/* Hidden apps row */}
      {config.hidden.length > 0 && (
        <Grid.Section title="">
          <Grid.Item
            title={`${config.hidden.length} hidden ${config.hidden.length === 1 ? "app" : "apps"}`}
            content={Icon.Eye}
            actions={
              <ActionPanel>
                <Action title="Unhide All" onAction={unhideAll} />
              </ActionPanel>
            }
          />
        </Grid.Section>
      )}

      {/* Empty-state action when there are zero items so the dropdown stays visible */}
      {config.folders.length === 0 && config.uncategorized.length === 0 && (
        <Grid.EmptyView title="No apps yet" />
      )}
    </Grid>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────────────

export function MoveToFolderAction({
  config,
  excludeFolderId,
  onMove,
}: {
  config: LaunchpadConfig;
  excludeFolderId?: string;
  onMove: (targetFolderId: string) => void;
}) {
  const targets = config.folders.filter((f) => f.id !== excludeFolderId);
  if (targets.length === 0) return null;
  return (
    <ActionPanel.Submenu title="Move to Folder" icon={Icon.Folder}>
      {targets.map((f) => (
        <Action key={f.id} title={f.name} onAction={() => onMove(f.id)} />
      ))}
    </ActionPanel.Submenu>
  );
}

export function MoveSelectedToFolderAction({
  count,
  config,
  onMove,
  excludeFolderId,
}: {
  count: number;
  config: LaunchpadConfig;
  onMove: (folderId: string) => void;
  excludeFolderId?: string;
}) {
  const targets = config.folders.filter((f) => f.id !== excludeFolderId);
  if (targets.length === 0) return null;
  return (
    <ActionPanel.Submenu
      title={`Move ${count} ${count === 1 ? "App" : "Apps"} to Folder`}
      icon={Icon.Folder}
    >
      {targets.map((f) => (
        <Action key={f.id} title={f.name} onAction={() => onMove(f.id)} />
      ))}
    </ActionPanel.Submenu>
  );
}

export function CreateFolderForm({ onCreate }: { onCreate: (name: string) => void }) {
  const { pop } = useNavigation();
  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Create"
            onSubmit={(values: { name: string }) => {
              if (values.name.trim()) onCreate(values.name.trim());
              pop();
            }}
          />
        </ActionPanel>
      }
    >
      <Form.TextField id="name" title="Folder Name" placeholder="e.g. Code" autoFocus />
    </Form>
  );
}

function RenameFolderForm({
  folder,
  onRename,
}: {
  folder: Folder;
  onRename: (name: string) => void;
}) {
  const { pop } = useNavigation();
  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Rename"
            onSubmit={(values: { name: string }) => {
              if (values.name.trim()) onRename(values.name.trim());
              pop();
            }}
          />
        </ActionPanel>
      }
    >
      <Form.TextField id="name" title="Folder Name" defaultValue={folder.name} autoFocus />
    </Form>
  );
}
