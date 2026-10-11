import { useEffect, useMemo, useState } from "react";
import {
  Action,
  ActionPanel,
  Form,
  Icon,
  List,
  Toast,
  showToast,
  useNavigation,
  Keyboard,
} from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { promises as fs } from "node:fs";
import * as path from "node:path";
import {
  FAVORITES,
  expandHome,
  formatSize,
  listDir,
  parentDir,
} from "./fs-utils";
import { clearAll, removePaths } from "./selection-store";
import { copyManyWithProgress, moveManyWithProgress } from "./copy-progress";
import { fuzzyScore } from "./fuzzy";

function isInside(child: string, parent: string): boolean {
  const rel = path.relative(parent, child);
  return rel !== "" && !rel.startsWith("..") && !path.isAbsolute(rel);
}

/**
 * The ONE copy/move flow (LaunchBar-style).
 *
 * Opened with Tab from the main browser. Shows the file tree (start folder per setting):
 * navigate with ←/→ only — Enter never enters folders here. Enter triggers
 * the transfer for the CURRENT folder, then forces a Copy vs Move choice.
 * Esc pops back to the browser and clears the selection (deselect).
 */
export function TransferTree(props: {
  sources: string[];
  initialPath: string;
  showHidden: boolean;
  /** Called with the destination folder so the browser can reveal results. */
  onDone: (destDir: string) => void;
  /**
   * Whether this transfer owns the global X-basket (clear on cancel/done).
   * The Finder-selection command passes false so its sources never disturb
   * a basket built in the main browser. Defaults to true.
   */
  manageBasket?: boolean;
}) {
  const { pop } = useNavigation();
  const { sources } = props;
  const [currentPath, setCurrentPath] = useState(props.initialPath);
  const [searchText, setSearchText] = useState("");
  const [highlightId, setHighlightId] = useState<string | undefined>(undefined);

  const manageBasket = props.manageBasket !== false;

  // Esc out of transfer = deselect + back to the normal tree (Tab flow
  // only — the Finder flow leaves the basket alone).
  useEffect(
    () => () => {
      if (manageBasket) clearAll();
    },
    [],
  );

  const { data, isLoading } = usePromise(
    async (dir: string, hidden: boolean) => {
      try {
        return await listDir(dir, hidden);
      } catch {
        await showToast({
          style: Toast.Style.Failure,
          title: "Cannot read folder",
          message: dir,
        });
        return [];
      }
    },
    [currentPath, props.showHidden],
  );

  const entries = useMemo(() => data ?? [], [data]);

  // Release the programmatic highlight once it has landed on a rendered
  // row (see browser for why presence-gating matters).
  useEffect(() => {
    if (highlightId === undefined) return;
    if (!entries.some((e) => e.fullPath === highlightId)) return;
    const t = setTimeout(() => setHighlightId(undefined), 350);
    return () => clearTimeout(t);
  }, [highlightId, entries]);
  const visible = useMemo(
    () => entries.filter((e) => fuzzyScore(searchText, e.name) !== null),
    [entries, searchText],
  );

  const sourceNames = useMemo(
    () => sources.map((s) => path.basename(s)),
    [sources],
  );
  const crumbs = currentPath.replace(/^\/Users\/[^/]+/, "~");

  function enter(dir: string) {
    setSearchText("");
    setHighlightId(undefined);
    setCurrentPath(dir);
  }

  function goUp() {
    if (currentPath === parentDir(currentPath)) return;
    // Land the highlight on the folder just left (released by the effect
    // below once it has actually landed).
    setHighlightId(currentPath);
    setSearchText("");
    setCurrentPath(parentDir(currentPath));
  }

  function jumpTo(target: string) {
    const resolved = expandHome(target);
    if (resolved === currentPath) return;
    setSearchText("");
    setHighlightId(undefined);
    setCurrentPath(resolved);
  }

  function cancel() {
    clearAll();
    pop();
  }

  async function execute(mode: "copy" | "move", destDir: string) {
    for (const src of sources) {
      if (src === destDir || isInside(destDir, src)) {
        await showToast({
          style: Toast.Style.Failure,
          title: `Cannot ${mode} a folder into itself`,
          message: src,
        });
        return;
      }
      if (path.dirname(src) === destDir && mode === "move") {
        await showToast({
          style: Toast.Style.Failure,
          title: "Already in this folder",
          message: destDir,
        });
        return;
      }
    }
    const verb = mode === "copy" ? "Copying" : "Moving";
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: `${verb} ${sources.length} Item${sources.length === 1 ? "" : "s"}…`,
      message: `→ ${destDir}`,
    });
    try {
      if (mode === "copy") {
        const r = await copyManyWithProgress(
          sources,
          destDir,
          toast,
          "Copying",
        );
        if (r.errors.length > 0) {
          toast.style = Toast.Style.Failure;
          toast.title = `Copied with ${r.errors.length} errors`;
          toast.message = r.errors.slice(0, 3).join("\n");
        } else {
          toast.style = Toast.Style.Success;
          toast.title = `Copied ${r.copied} Item${r.copied === 1 ? "" : "s"}`;
          toast.message = `→ ${destDir}`;
        }
      } else {
        const r = await moveManyWithProgress(sources, destDir, toast, "Moving");
        if (r.errors.length > 0) {
          toast.style = Toast.Style.Failure;
          toast.title = `Moved with ${r.errors.length} errors`;
          toast.message = r.errors.slice(0, 3).join("\n");
        } else {
          toast.style = Toast.Style.Success;
          toast.title = `Moved ${r.moved} Item${r.moved === 1 ? "" : "s"}`;
          toast.message = `→ ${destDir}`;
        }
        if (manageBasket) removePaths(sources);
      }
      if (manageBasket) clearAll();
      props.onDone(destDir);
      pop();
    } catch (e) {
      toast.style = Toast.Style.Failure;
      toast.title = `${mode === "copy" ? "Copy" : "Move"} failed`;
      toast.message = String(e);
    }
  }

  // Enter on a highlighted folder targets THAT folder; Enter on a file row
  // targets the displayed folder (files can't contain anything).
  function transferMenu(destDir: string, intoName: string | null) {
    const title = intoName ? `Transfer Into ${intoName}…` : "Transfer…";
    const copyTitle = intoName ? `Copy Into ${intoName}` : "Copy Here";
    const moveTitle = intoName ? `Move Into ${intoName}` : "Move Here";
    return (
      <ActionPanel.Submenu title={title}>
        <Action
          title={copyTitle}
          icon={Icon.Clipboard}
          onAction={() => execute("copy", destDir)}
        />
        <Action
          title={moveTitle}
          icon={Icon.Move}
          onAction={() => execute("move", destDir)}
        />
      </ActionPanel.Submenu>
    );
  }

  return (
    <List
      isLoading={isLoading}
      navigationTitle={`Transfer → ${crumbs}`}
      searchBarPlaceholder="←/→ navigate, Enter confirms, Esc cancels"
      searchText={searchText}
      onSearchTextChange={setSearchText}
      filtering={false}
      selectedItemId={highlightId}
      onSelectionChange={(id) => {
        if (id) setHighlightId(undefined);
      }}
    >
      <List.Section
        title={`${sourceNames.slice(0, 3).join(", ")}${sourceNames.length > 3 ? ` +${sourceNames.length - 3} more` : ""}`}
        subtitle={`${visible.length} items`}
      >
        {visible.map((entry) =>
          entry.isDirectory ? (
            <List.Item
              key={entry.fullPath}
              id={entry.fullPath}
              title={entry.name}
              icon={Icon.Folder}
              keywords={[entry.name]}
              quickLook={{ path: entry.fullPath, name: entry.name }}
              actions={
                <ActionPanel>
                  {transferMenu(entry.fullPath, entry.name)}
                  <Action
                    title="Enter Folder"
                    icon={Icon.ArrowRight}
                    shortcut={{ modifiers: [], key: "space" }}
                    onAction={() => enter(entry.fullPath)}
                  />
                  <Action
                    title="Enter Folder"
                    icon={Icon.ArrowRight}
                    shortcut={{ modifiers: [], key: "arrowRight" }}
                    onAction={() => enter(entry.fullPath)}
                  />
                  <Action
                    title="Go up"
                    icon={Icon.ArrowLeft}
                    shortcut={{ modifiers: [], key: "arrowLeft" }}
                    onAction={goUp}
                  />
                  <Action.Push
                    title="New Folder…"
                    icon={Icon.NewFolder}
                    shortcut={Keyboard.Shortcut.Common.New}
                    target={
                      <TransferNewFolderForm
                        dir={currentPath}
                        onCreated={(full) => enter(full)}
                      />
                    }
                  />
                  <Action
                    title="Cancel Transfer"
                    icon={Icon.XMarkCircle}
                    onAction={cancel}
                  />
                  <ActionPanel.Section title="Go">
                    {FAVORITES.map((f) => (
                      <Action
                        key={f.path}
                        title={`Go to ${f.title}`}
                        icon={Icon.House}
                        onAction={() => jumpTo(f.path)}
                      />
                    ))}
                  </ActionPanel.Section>
                </ActionPanel>
              }
            />
          ) : (
            <List.Item
              key={entry.fullPath}
              id={entry.fullPath}
              title={entry.name}
              subtitle={formatSize(entry.size, false)}
              icon={Icon.Document}
              keywords={[entry.name, entry.extension]}
              quickLook={{ path: entry.fullPath, name: entry.name }}
              actions={
                <ActionPanel>
                  {transferMenu(currentPath, null)}
                  <Action
                    title="Go up"
                    icon={Icon.ArrowLeft}
                    shortcut={{ modifiers: [], key: "arrowLeft" }}
                    onAction={goUp}
                  />
                  <Action.ToggleQuickLook
                    shortcut={{ modifiers: [], key: "space" }}
                  />
                  <Action.Push
                    title="New Folder…"
                    icon={Icon.NewFolder}
                    shortcut={Keyboard.Shortcut.Common.New}
                    target={
                      <TransferNewFolderForm
                        dir={currentPath}
                        onCreated={(full) => enter(full)}
                      />
                    }
                  />
                  <Action
                    title="Cancel Transfer"
                    icon={Icon.XMarkCircle}
                    onAction={cancel}
                  />
                </ActionPanel>
              }
            />
          ),
        )}
      </List.Section>
      {visible.length === 0 && !isLoading ? (
        <List.EmptyView
          icon={Icon.Folder}
          title="Empty folder"
          description="Enter transfers into this folder, ← goes up"
          actions={
            <ActionPanel>
              {transferMenu(currentPath, null)}
              <Action
                title="Go up"
                icon={Icon.ArrowLeft}
                shortcut={{ modifiers: [], key: "arrowLeft" }}
                onAction={goUp}
              />
              <Action.Push
                title="New Folder…"
                icon={Icon.NewFolder}
                shortcut={Keyboard.Shortcut.Common.New}
                target={
                  <TransferNewFolderForm
                    dir={currentPath}
                    onCreated={(full) => enter(full)}
                  />
                }
              />
              <Action
                title="Cancel Transfer"
                icon={Icon.XMarkCircle}
                onAction={cancel}
              />
            </ActionPanel>
          }
        />
      ) : null}
    </List>
  );
}

function TransferNewFolderForm(props: {
  dir: string;
  onCreated: (fullPath: string) => void;
}) {
  const { pop } = useNavigation();
  const [name, setName] = useState("Untitled Folder");
  const [error, setError] = useState<string | undefined>();
  return (
    <Form
      navigationTitle={`New folder in ${props.dir}`}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Create and Enter Folder"
            onSubmit={async () => {
              if (!name.trim()) {
                setError("Name cannot be empty");
                return;
              }
              const full = path.join(props.dir, name.trim());
              try {
                await fs.mkdir(full);
                await showToast({
                  style: Toast.Style.Success,
                  title: "Folder created",
                });
                props.onCreated(full);
                pop();
              } catch (e) {
                await showToast({
                  style: Toast.Style.Failure,
                  title: "Create failed",
                  message: String(e),
                });
              }
            }}
          />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="name"
        title="Folder name"
        value={name}
        error={error}
        onChange={setName}
      />
    </Form>
  );
}
