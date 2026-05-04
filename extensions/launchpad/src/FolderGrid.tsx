import {
  Action,
  ActionPanel,
  Grid,
  Icon,
  open,
  showHUD,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { useEffect, useState } from "react";
import { AppEntry, Folder, LaunchpadConfig } from "./types";
import {
  CreateFolderForm,
  Mode,
  MoveSelectedToFolderAction,
  MoveToFolderAction,
  pluralizeApps,
} from "./launchpad";
import crypto from "crypto";

interface Props {
  folderId: string;
  config: LaunchpadConfig;
  mode: Mode;
  onConfigChange: (config: LaunchpadConfig) => void;
}

export function FolderGrid({ folderId, config: initialConfig, mode, onConfigChange }: Props) {
  const { pop, push } = useNavigation();
  const [selected, setSelected] = useState<Set<string>>(new Set());

  // Pushed children in Raycast's nav stack don't re-render when the parent's
  // state changes. We therefore keep our own copy of `config`, seed it from
  // the prop, and refresh it on every local mutation. The parent stays in
  // sync via `onConfigChange`.
  const [config, setLocalConfig] = useState<LaunchpadConfig>(initialConfig);

  const folder: Folder | undefined = config.folders.find((f) => f.id === folderId);

  // If the folder no longer exists, pop back to the parent. Pop must run as a
  // side-effect, not during render.
  useEffect(() => {
    if (!folder) pop();
  }, [folder]);

  if (!folder) return <Grid />;
  const isMulti = mode === "multi";
  const selectionCount = selected.size;

  function update(next: LaunchpadConfig) {
    setLocalConfig(next);          // refresh THIS view immediately
    onConfigChange(next);           // parent persists + rebuilds folder icons synchronously
  }

  // ── App actions ─────────────────────────────────────────────────────────

  async function launch(app: AppEntry) {
    try {
      await open(app.path);
      await showHUD(`Opened ${app.name}`);
    } catch {
      await showToast({ style: Toast.Style.Failure, title: `Failed to open ${app.name}` });
    }
  }

  function moveToUncategorized(app: AppEntry) {
    update({
      ...config,
      folders: config.folders.map((f) =>
        f.id === folder!.id
          ? { ...f, apps: f.apps.filter((a) => a.bundleId !== app.bundleId) }
          : f
      ),
      // Apps moved out of a folder land at the BEGINNING of uncategorized so
      // they're easy to find right after the action.
      uncategorized: [app, ...config.uncategorized],
    });
  }

  function hideApp(app: AppEntry) {
    update({
      ...config,
      folders: config.folders.map((f) =>
        f.id === folder!.id
          ? { ...f, apps: f.apps.filter((a) => a.bundleId !== app.bundleId) }
          : f
      ),
      hidden: [...config.hidden, app],
    });
  }

  function moveToFolder(app: AppEntry, targetFolderId: string) {
    update({
      ...config,
      folders: config.folders.map((f) => {
        if (f.id === folder!.id)
          return { ...f, apps: f.apps.filter((a) => a.bundleId !== app.bundleId) };
        if (f.id === targetFolderId) return { ...f, apps: [...f.apps, app] };
        return f;
      }),
    });
  }

  // Apps flow left-to-right within the folder grid; "left" = earlier in the
  // array, "right" = later, matching the visual direction the user sees.
  function moveAppLeftInFolder(bundleId: string) {
    const idx = folder!.apps.findIndex((a) => a.bundleId === bundleId);
    if (idx <= 0) return;
    const apps = [...folder!.apps];
    [apps[idx - 1], apps[idx]] = [apps[idx], apps[idx - 1]];
    update({
      ...config,
      folders: config.folders.map((f) => (f.id === folder!.id ? { ...f, apps } : f)),
    });
  }

  function moveAppRightInFolder(bundleId: string) {
    const idx = folder!.apps.findIndex((a) => a.bundleId === bundleId);
    if (idx < 0 || idx >= folder!.apps.length - 1) return;
    const apps = [...folder!.apps];
    [apps[idx], apps[idx + 1]] = [apps[idx + 1], apps[idx]];
    update({
      ...config,
      folders: config.folders.map((f) => (f.id === folder!.id ? { ...f, apps } : f)),
    });
  }

  // ── Multi-Move (selection scoped to this folder only) ────────────────────

  function toggleSelect(bundleId: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(bundleId) ? next.delete(bundleId) : next.add(bundleId);
      return next;
    });
  }

  function selectAll() {
    setSelected(new Set(folder!.apps.map((a) => a.bundleId)));
  }

  function clearSelection() {
    setSelected(new Set());
  }

  function moveSelectedToFolder(targetFolderId: string) {
    const selectedApps = folder!.apps.filter((a) => selected.has(a.bundleId));
    if (selectedApps.length === 0) return;
    update({
      ...config,
      folders: config.folders.map((f) => {
        if (f.id === folder!.id)
          return { ...f, apps: f.apps.filter((a) => !selected.has(a.bundleId)) };
        if (f.id === targetFolderId) return { ...f, apps: [...f.apps, ...selectedApps] };
        return f;
      }),
    });
    clearSelection();
  }

  function moveSelectedToTopLevel() {
    const selectedApps = folder!.apps.filter((a) => selected.has(a.bundleId));
    if (selectedApps.length === 0) return;
    update({
      ...config,
      folders: config.folders.map((f) =>
        f.id === folder!.id
          ? { ...f, apps: f.apps.filter((a) => !selected.has(a.bundleId)) }
          : f
      ),
      uncategorized: [...selectedApps, ...config.uncategorized],
    });
    clearSelection();
  }

  function moveSelectedToNewFolder(name: string) {
    const selectedApps = folder!.apps.filter((a) => selected.has(a.bundleId));
    if (selectedApps.length === 0) return;
    const newFolder: Folder = {
      id: crypto.randomUUID(),
      name,
      apps: selectedApps,
    };
    update({
      ...config,
      folders: [
        ...config.folders.map((f) =>
          f.id === folder!.id
            ? { ...f, apps: f.apps.filter((a) => !selected.has(a.bundleId)) }
            : f
        ),
        newFolder,
      ],
    });
    clearSelection();
  }

  return (
    <Grid
      columns={8}
      inset={Grid.Inset.Small}
      navigationTitle={
        isMulti
          ? `${folder.name} — Multi-Move${selectionCount > 0 ? ` (${selectionCount})` : ""}`
          : folder.name
      }
      searchBarPlaceholder={
        isMulti ? `Select apps in ${folder.name} to bulk-move…` : `Search ${folder.name}…`
      }
    >
      <Grid.Section title={folder.name} subtitle={pluralizeApps(folder.apps.length)}>
        {folder.apps.map((app) => {
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
                          pop();
                        }}
                      />
                      <Action
                        title="Select All"
                        icon={Icon.CheckList}
                        onAction={selectAll}
                      />
                      <Action
                        title="Deselect All"
                        icon={Icon.XMarkCircle}
                        onAction={clearSelection}
                      />
                      {selectionCount > 0 && (
                        <Action
                          title={`Move ${selectionCount} ${selectionCount === 1 ? "App" : "Apps"} to Top Level`}
                          icon={Icon.ArrowUp}
                          onAction={moveSelectedToTopLevel}
                        />
                      )}
                      {selectionCount > 0 && (
                        <MoveSelectedToFolderAction
                          count={selectionCount}
                          config={config}
                          excludeFolderId={folder.id}
                          onMove={moveSelectedToFolder}
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
                                onCreate={(name) => moveSelectedToNewFolder(name)}
                              />
                            )
                          }
                        />
                      )}
                    </>
                  ) : (
                    <>
                      <Action title="Open" onAction={() => launch(app)} />
                      <Action
                        title="Move to Top Level"
                        icon={Icon.ArrowUp}
                        onAction={() => moveToUncategorized(app)}
                      />
                      <MoveToFolderAction
                        config={config}
                        excludeFolderId={folder.id}
                        onMove={(targetFolderId) => moveToFolder(app, targetFolderId)}
                      />
                      <Action
                        title="Move App Left"
                        icon={Icon.ArrowLeft}
                        shortcut={{ modifiers: ["opt", "shift"], key: "arrowLeft" }}
                        onAction={() => moveAppLeftInFolder(app.bundleId)}
                      />
                      <Action
                        title="Move App Right"
                        icon={Icon.ArrowRight}
                        shortcut={{ modifiers: ["opt", "shift"], key: "arrowRight" }}
                        onAction={() => moveAppRightInFolder(app.bundleId)}
                      />
                      <Action
                        title="Hide App"
                        icon={Icon.EyeDisabled}
                        style={Action.Style.Destructive}
                        onAction={() => hideApp(app)}
                      />
                    </>
                  )}
                </ActionPanel>
              }
            />
          );
        })}
      </Grid.Section>
    </Grid>
  );
}
