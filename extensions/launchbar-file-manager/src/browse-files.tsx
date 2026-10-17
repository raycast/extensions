import { useEffect, useMemo, useState } from "react";
import {
  Action,
  ActionPanel,
  Alert,
  Color,
  Form,
  Icon,
  List,
  Toast,
  confirmAlert,
  getPreferenceValues,
  open,
  showInFinder,
  showToast,
  useNavigation,
  Keyboard,
  LocalStorage,
} from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { promises as fs } from "node:fs";
import * as path from "node:path";
import {
  FAVORITES,
  FileEntry,
  expandHome,
  fileKind,
  formatDate,
  formatSize,
  listDir,
  parentDir,
} from "./fs-utils";
import {
  addPaths,
  clearAll,
  removePaths,
  togglePath,
  useGlobalSelection,
} from "./selection-store";
import { copyManyWithProgress } from "./copy-progress";
import {
  archiveDisplayName,
  compressMany,
  compressOne,
  extractZip,
} from "./archive";
import { safeTrash, shortError } from "./trash-safe";
import { TransferTree } from "./transfer-tree";
import { AppPicker } from "./app-picker";
import { fuzzyScore } from "./fuzzy";

function getPrefs(): Preferences.BrowseFiles {
  try {
    return getPreferenceValues<Preferences.BrowseFiles>();
  } catch {
    return {
      startingPath: "~",
      startBehavior: "start",
      showHiddenDefault: false,
      transferStart: "home",
    };
  }
}

const STATE_KEY = "launchbar-file-manager:browser-state";

export default function Command() {
  const p = getPrefs();
  const start = expandHome(p.startingPath || "~");
  const [showHidden, setShowHidden] = useState<boolean>(!!p.showHiddenDefault);
  const [showDetail, setShowDetail] = useState(false);
  const [initialDir, setInitialDir] = useState<string | null>(null);

  // Startup folder per setting: chosen folder (home) or last opened folder.
  // The basket is always cleared on open — exiting deselects.
  useEffect(() => {
    clearAll();
    (async () => {
      let dir: string | null = null;
      if (p.startBehavior === "last") {
        try {
          const raw = await LocalStorage.getItem<string>(STATE_KEY);
          if (raw) {
            const saved = JSON.parse(raw) as { dir?: unknown };
            if (typeof saved.dir === "string") {
              const st = await fs.stat(saved.dir);
              if (st.isDirectory()) dir = saved.dir;
            }
          }
        } catch {
          // Unreadable/corrupt — fall back to the chosen folder.
        }
      }
      setInitialDir(dir ?? start);
    })();
  }, []);

  if (initialDir === null) {
    return <List isLoading={true} searchBarPlaceholder="Opening…" />;
  }
  return (
    <FileBrowser
      initialPath={initialDir}
      homePath={start}
      showHidden={showHidden}
      showDetail={showDetail}
      onToggleHidden={() => setShowHidden((v) => !v)}
      onToggleDetail={() => setShowDetail((v) => !v)}
    />
  );
}

function FileBrowser(props: {
  initialPath: string;
  /** Home dir from settings — where Tab transfer trees start. */
  homePath: string;
  showHidden: boolean;
  showDetail: boolean;
  onToggleHidden: () => void;
  onToggleDetail: () => void;
}) {
  // Single-view browser: navigation is state, not a push stack — so Esc
  // exits the extension instead of climbing folders. (Only Tab transfer and
  // forms push views.)
  const { push } = useNavigation();
  const [currentPath, setCurrentPath] = useState(props.initialPath);
  const [searchText, setSearchText] = useState("");
  // Highlight follows navigation: going up lands on the folder just left.
  // Control is released as soon as the landing registers — otherwise every
  // arrow key would re-render + re-center the list instead of scrolling
  // natively (stable until the visible edge, then shift).
  const [highlightId, setHighlightId] = useState<string | undefined>(undefined);
  // Global basket: survives push/pop so the selection stays visible across
  // navigation. Copy/move happens only via Tab → transfer tree.
  const { selected } = useGlobalSelection();

  // Remember the last opened folder (only the folder — the basket is
  // always cleared on open, so exiting deselects).
  useEffect(() => {
    void LocalStorage.setItem(STATE_KEY, JSON.stringify({ dir: currentPath }));
  }, [currentPath]);

  const { data, isLoading, revalidate } = usePromise(
    async (dir: string, hidden: boolean) => {
      try {
        return await listDir(dir, hidden);
      } catch {
        await showToast({
          style: Toast.Style.Failure,
          title: "Cannot read folder",
          message: dir,
        });
        return [] as FileEntry[];
      }
    },
    [currentPath, props.showHidden],
  );

  const entries = useMemo(() => data ?? [], [data]);
  const selectedSet = useMemo(() => new Set(selected), [selected]);

  // Release the programmatic highlight once it has landed on a rendered
  // row. Holding it longer would re-center the list on every arrow key;
  // releasing before the row exists (loading gap) would drop the landing
  // entirely — so wait for the target to be present first.
  useEffect(() => {
    if (highlightId === undefined) return;
    if (!entries.some((e) => e.fullPath === highlightId)) return;
    const t = setTimeout(() => setHighlightId(undefined), 350);
    return () => clearTimeout(t);
  }, [highlightId, entries]);
  // Ranked fuzzy results: dirs first (drill-first UX), then best fuzzy
  // score, then alphabetical. Empty query keeps the raw folder order.
  const visibleEntries = useMemo(() => {
    const q = searchText.trim();
    if (!q) return entries;
    return entries
      .map((e) => ({ entry: e, score: fuzzyScore(q, e.name) }))
      .filter((x): x is { entry: FileEntry; score: number } => x.score !== null)
      .sort(
        (a, b) =>
          Number(b.entry.isDirectory) - Number(a.entry.isDirectory) ||
          b.score - a.score ||
          a.entry.name.localeCompare(b.entry.name, undefined, {
            sensitivity: "base",
          }),
      )
      .map((x) => x.entry);
  }, [entries, searchText]);

  const filteredEntries = useMemo(
    () => entries.filter((e) => fuzzyScore(searchText, e.name) !== null),
    [entries, searchText],
  );

  function toggleSelect(fullPath: string) {
    togglePath(fullPath);
  }

  function selectAll() {
    addPaths(entries.map((e) => e.fullPath));
  }

  function selectFiltered() {
    addPaths(filteredEntries.map((e) => e.fullPath));
  }

  function clearSelection() {
    clearAll();
  }

  function enterFolder(folderPath: string) {
    setSearchText("");
    setHighlightId(undefined);
    setCurrentPath(folderPath);
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

  // THE copy/move flow: Tab on any row. Basket non-empty → transfer the
  // basket; otherwise transfer just the highlighted item. Opens the transfer
  // tree (from home or current folder per setting), where Enter confirms
  // and ←/→ navigate.
  function openTransfer(fallbackPath: string) {
    const sources = selected.length > 0 ? [...selected] : [fallbackPath];
    const startDir =
      getPrefs().transferStart === "current" ? currentPath : props.homePath;
    push(
      <TransferTree
        sources={sources}
        initialPath={startDir}
        showHidden={props.showHidden}
        onDone={(destDir) => {
          // Reveal the results: open the destination, not the origin.
          setSearchText("");
          setCurrentPath(destDir);
          refresh();
        }}
      />,
    );
  }

  async function pruneMissing() {
    // Drop only paths that no longer exist on disk — NOT paths from other
    // folders. Old code pruned against current-folder entries, which wiped
    // cross-folder selections as soon as you navigated.
    const gone: string[] = [];
    await Promise.all(
      selected.map(async (p) => {
        try {
          await fs.access(p);
        } catch {
          gone.push(p);
        }
      }),
    );
    if (gone.length > 0) removePaths(gone);
  }

  async function refresh() {
    await revalidate();
    await pruneMissing();
  }

  const crumbs = currentPath.replace(/^\/Users\/[^/]+/, "~");

  return (
    <List
      isLoading={isLoading}
      navigationTitle={crumbs}
      searchBarPlaceholder={`${entries.length} items · ${selected.length} selected — ↑↓ filter, X select, Tab transfer, ← up`}
      searchText={searchText}
      onSearchTextChange={setSearchText}
      filtering={false}
      selectedItemId={highlightId}
      onSelectionChange={(id) => {
        // Real landing or user move — release. Null (loading gap or
        // filtered-out target) must NOT clear, or the landing is lost.
        if (id) setHighlightId(undefined);
      }}
      isShowingDetail={props.showDetail && entries.length > 0}
    >
      {/* No List.Section: a section header would scroll away on long lists
          and shift the content. Flat items keep the list consistent; the
          counts live in the always-visible search bar instead. */}
      <>
        {visibleEntries.map((entry) => (
          <FileRow
            key={entry.fullPath}
            entry={entry}
            currentPath={currentPath}
            showDetail={props.showDetail}
            isSelected={selectedSet.has(entry.fullPath)}
            selectedCount={selected.length}
            selectedPaths={selected}
            searchActive={searchText.trim().length > 0}
            onToggleSelect={() => toggleSelect(entry.fullPath)}
            onSelectAll={selectAll}
            onSelectFiltered={selectFiltered}
            onClearSelection={clearSelection}
            onEnterFolder={enterFolder}
            onJump={jumpTo}
            onTransfer={() => openTransfer(entry.fullPath)}
            onChanged={refresh}
            onToggleHidden={props.onToggleHidden}
            onToggleDetail={props.onToggleDetail}
            onGoUp={goUp}
          />
        ))}
      </>
      {visibleEntries.length === 0 && !isLoading && entries.length === 0 ? (
        <List.EmptyView
          icon={Icon.Folder}
          title="Empty folder"
          description={
            selected.length > 0
              ? "Tab transfers your selection, ← goes up"
              : "Create something here, or press ← to go up"
          }
          actions={
            <ActionPanel>
              {selected.length > 0 ? (
                <Action
                  title="Transfer Selected… (Tab)"
                  icon={Icon.Switch}
                  shortcut={{ modifiers: [], key: "tab" }}
                  onAction={() => openTransfer(selected[0])}
                />
              ) : null}
              <Action.Push
                title="New Folder…"
                icon={Icon.NewFolder}
                target={<NewFolderForm dir={currentPath} onDone={refresh} />}
              />
              <Action.Push
                title="New File…"
                icon={Icon.NewDocument}
                target={<NewFileForm dir={currentPath} onDone={refresh} />}
              />
              <Action
                title="Toggle Hidden Files"
                icon={Icon.Eye}
                shortcut={Keyboard.Shortcut.Common.Pin}
                onAction={props.onToggleHidden}
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
              <Action
                title="Go up"
                icon={Icon.ArrowLeft}
                shortcut={{ modifiers: [], key: "arrowLeft" }}
                onAction={goUp}
              />
            </ActionPanel>
          }
        />
      ) : null}
      {visibleEntries.length === 0 && !isLoading && entries.length > 0 ? (
        <List.EmptyView
          icon={Icon.MagnifyingGlass}
          title="No matches"
          description={`Nothing in ${path.basename(currentPath) || currentPath} matches "${searchText}"`}
          actions={
            <ActionPanel>
              <Action
                title="Clear Search"
                icon={Icon.XMarkCircle}
                onAction={() => setSearchText("")}
              />
              <Action
                title="Go up"
                icon={Icon.ArrowLeft}
                shortcut={{ modifiers: [], key: "arrowLeft" }}
                onAction={goUp}
              />
            </ActionPanel>
          }
        />
      ) : null}
    </List>
  );
}

function FileRow(props: {
  entry: FileEntry;
  currentPath: string;
  showDetail: boolean;
  isSelected: boolean;
  selectedCount: number;
  selectedPaths: string[];
  searchActive: boolean;
  onToggleSelect: () => void;
  onSelectAll: () => void;
  onSelectFiltered: () => void;
  onClearSelection: () => void;
  onEnterFolder: (p: string) => void;
  onJump: (p: string) => void;
  onTransfer: () => void;
  onChanged: () => void;
  onToggleHidden: () => void;
  onToggleDetail: () => void;
  onGoUp: () => void;
}) {
  const { entry, onEnterFolder, onChanged } = props;
  const selectedPaths = props.selectedPaths;
  function trashSelectedHere() {
    trashPaths([...selectedPaths], onChanged);
  }
  function compressSelectedHere() {
    compressSelected([...selectedPaths], props.currentPath, onChanged);
  }
  const baseIcon = entry.isDirectory ? Icon.Folder : fileIcon(entry.extension);
  const icon = props.isSelected
    ? { source: Icon.CheckCircle, tintColor: Color.Green }
    : baseIcon;

  const accessories: List.Item.Accessory[] = [];
  if (props.isSelected) {
    accessories.push({ tag: { value: "Selected", color: Color.Green } });
  }
  accessories.push({
    text: entry.isDirectory ? "Folder" : fileKind(entry),
  });
  accessories.push({ date: entry.mtime });

  const detail = props.showDetail ? (
    <List.Item.Detail
      markdown={detailMarkdown(entry, props.isSelected)}
      metadata={
        <List.Item.Detail.Metadata>
          <List.Item.Detail.Metadata.Label
            title="Kind"
            text={fileKind(entry)}
          />
          <List.Item.Detail.Metadata.Label
            title="Size"
            text={formatSize(entry.size, entry.isDirectory)}
          />
          <List.Item.Detail.Metadata.Label
            title="Modified"
            text={formatDate(entry.mtime)}
          />
          <List.Item.Detail.Metadata.Separator />
          <List.Item.Detail.Metadata.Label
            title="Selected"
            text={props.isSelected ? "Yes" : "No"}
          />
          <List.Item.Detail.Metadata.Label title="Path" text={entry.fullPath} />
          <List.Item.Detail.Metadata.Label title="Name" text={entry.name} />
        </List.Item.Detail.Metadata>
      }
    />
  ) : undefined;

  return (
    <List.Item
      id={entry.fullPath}
      title={props.isSelected ? `✓ ${entry.name}` : entry.name}
      subtitle={entry.isDirectory ? undefined : formatSize(entry.size, false)}
      accessories={accessories}
      icon={icon}
      keywords={[entry.name, entry.extension]}
      detail={detail}
      quickLook={{ path: entry.fullPath, name: entry.name }}
      actions={
        <ActionPanel>
          {entry.isDirectory ? (
            <>
              <Action
                title="Open Folder"
                icon={Icon.ArrowRight}
                shortcut={{ modifiers: [], key: "space" }}
                onAction={() => onEnterFolder(entry.fullPath)}
              />
              <Action
                title="Open Folder"
                icon={Icon.ArrowRight}
                shortcut={{ modifiers: [], key: "arrowRight" }}
                onAction={() => onEnterFolder(entry.fullPath)}
              />
            </>
          ) : (
            <>
              <Action
                title="Open File"
                icon={Icon.Document}
                onAction={() => open(entry.fullPath)}
              />
              <Action.ToggleQuickLook
                shortcut={{ modifiers: [], key: "space" }}
              />
            </>
          )}
          {/* THE transfer flow: Tab sends this item (or the X-basket) to the transfer tree */}
          <Action
            title={
              props.selectedCount > 0
                ? `Transfer ${props.selectedCount} Selected… (Tab)`
                : "Transfer This Item… (Tab)"
            }
            icon={Icon.Switch}
            shortcut={{ modifiers: [], key: "tab" }}
            onAction={props.onTransfer}
          />
          <Action.Push
            title="Open with…"
            icon={Icon.AppWindow}
            target={<AppPicker filePath={entry.fullPath} />}
          />
          <Action
            title="Go up"
            icon={Icon.ArrowLeft}
            shortcut={{ modifiers: [], key: "arrowLeft" }}
            onAction={props.onGoUp}
          />
          <Action
            title="Go up Alternative"
            icon={Icon.ArrowLeft}
            shortcut={{ modifiers: ["cmd"], key: "[" }}
            onAction={props.onGoUp}
          />
          <Action
            title="Show in Finder"
            icon={Icon.Finder}
            shortcut={Keyboard.Shortcut.Common.Open}
            onAction={() => showInFinder(entry.fullPath)}
          />

          {/* multi-select: filter, ↑↓ to highlight, X to toggle */}
          <ActionPanel.Section title="Select">
            <Action
              title={props.isSelected ? "Deselect" : "Select"}
              icon={props.isSelected ? Icon.XMarkCircle : Icon.CheckCircle}
              shortcut={{ modifiers: [], key: "x" }}
              onAction={props.onToggleSelect}
            />
            <Action
              title="Select All in Folder"
              icon={Icon.CheckRosette}
              shortcut={{ modifiers: ["cmd", "shift"], key: "a" }}
              onAction={props.onSelectAll}
            />
            {props.searchActive ? (
              <Action
                title="Select Filtered Results"
                icon={Icon.MagnifyingGlass}
                shortcut={{ modifiers: ["cmd", "shift"], key: "f" }}
                onAction={props.onSelectFiltered}
              />
            ) : null}
            {props.selectedCount > 0 ? (
              <>
                <Action
                  title={`Trash Selected (${props.selectedCount})`}
                  icon={Icon.Trash}
                  style={Action.Style.Destructive}
                  onAction={() => trashSelectedHere()}
                />
                <Action
                  title="Compress Selected to ZIP Here"
                  icon={Icon.Box}
                  onAction={() => compressSelectedHere()}
                />
                <Action.CopyToClipboard
                  title="Copy Selected Paths"
                  content={selectedPaths.join("\n")}
                />
                <Action
                  title={`Clear Selection (${props.selectedCount})`}
                  icon={Icon.XMarkCircle}
                  shortcut={{ modifiers: ["cmd", "shift"], key: "x" }}
                  onAction={props.onClearSelection}
                />
              </>
            ) : null}
          </ActionPanel.Section>

          <ActionPanel.Section title="LaunchBar-style ops">
            <Action.Push
              title="Rename…"
              icon={Icon.Pencil}
              shortcut={Keyboard.Shortcut.Common.Refresh}
              target={<RenameForm entry={entry} onDone={onChanged} />}
            />
            <Action
              title="Duplicate"
              icon={Icon.CopyClipboard}
              shortcut={{ modifiers: ["cmd"], key: "d" }}
              onAction={() => duplicateEntry(entry, onChanged)}
            />
            <Action
              title="Compress to ZIP"
              icon={Icon.Box}
              shortcut={{ modifiers: ["cmd", "shift"], key: "z" }}
              onAction={() => compressEntry(entry, onChanged)}
            />
            {entry.extension === ".zip" ? (
              <Action
                title="Extract Here"
                icon={Icon.Upload}
                onAction={() => extractEntry(entry, onChanged)}
              />
            ) : null}
            <Action
              title="Move to Trash"
              icon={Icon.Trash}
              style={Action.Style.Destructive}
              shortcut={{ modifiers: ["cmd"], key: "backspace" }}
              onAction={() => moveToTrash(entry, onChanged)}
            />
          </ActionPanel.Section>

          <ActionPanel.Section title="Create">
            <Action.Push
              title="New Folder…"
              icon={Icon.NewFolder}
              target={
                <NewFolderForm dir={props.currentPath} onDone={onChanged} />
              }
            />
            <Action.Push
              title="New File…"
              icon={Icon.NewDocument}
              target={
                <NewFileForm dir={props.currentPath} onDone={onChanged} />
              }
            />
          </ActionPanel.Section>

          <ActionPanel.Section title="Copy">
            <Action.CopyToClipboard
              title="Copy Path"
              content={entry.fullPath}
              shortcut={Keyboard.Shortcut.Common.CopyName}
            />
            <Action.CopyToClipboard
              title="Copy File Name"
              content={entry.name}
            />
          </ActionPanel.Section>

          <ActionPanel.Section title="View">
            <Action
              title={
                props.showDetail
                  ? "Hide Details"
                  : "Show Details (Info Browsing)"
              }
              icon={Icon.Sidebar}
              shortcut={{ modifiers: ["cmd"], key: "i" }}
              onAction={props.onToggleDetail}
            />
            <Action
              title="Toggle Hidden Files"
              icon={Icon.Eye}
              shortcut={Keyboard.Shortcut.Common.Pin}
              onAction={props.onToggleHidden}
            />
          </ActionPanel.Section>

          <ActionPanel.Section title="Go">
            {FAVORITES.map((f) => (
              <Action
                key={f.path}
                title={`Go to ${f.title}`}
                icon={Icon.House}
                onAction={() => props.onJump(f.path)}
              />
            ))}
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}

function fileIcon(ext: string) {
  switch (ext) {
    case ".png":
    case ".jpg":
    case ".jpeg":
    case ".gif":
    case ".heic":
    case ".webp":
      return Icon.Image;
    case ".pdf":
      return Icon.Document;
    case ".mp3":
    case ".wav":
    case ".m4a":
    case ".flac":
      return Icon.Music;
    case ".mp4":
    case ".mov":
    case ".mkv":
      return Icon.Video;
    case ".zip":
    case ".tar":
    case ".gz":
    case ".rar":
    case ".7z":
      return Icon.Box;
    case ".ts":
    case ".tsx":
    case ".js":
    case ".jsx":
    case ".py":
    case ".rb":
    case ".go":
    case ".rs":
    case ".swift":
      return Icon.Code;
    case ".md":
    case ".txt":
      return Icon.Text;
    default:
      return Icon.Document;
  }
}

function detailMarkdown(entry: FileEntry, isSelected: boolean): string {
  const lines = [
    `# ${entry.name}`,
    ``,
    `${fileKind(entry)} · ${formatSize(entry.size, entry.isDirectory)}`,
    ``,
    `Modified: ${formatDate(entry.mtime)}`,
    isSelected ? `Selected ✓` : ``,
  ];
  if (entry.isDirectory) {
    lines.push("", "Space or → enters, ← goes up. X selects, Tab transfers.");
  } else if (entry.extension === ".md" || entry.extension === ".txt") {
    lines.push(
      "",
      "_Space previews (Quick Look), Enter opens, Tab transfers._",
    );
  } else {
    lines.push(
      "",
      "_Space previews (Quick Look), Enter opens, Tab transfers._",
    );
  }
  lines.push("", `\`${entry.fullPath}\``);
  return lines.join("\n");
}

// ---------- Forms ----------

function RenameForm(props: { entry: FileEntry; onDone: () => void }) {
  const { pop } = useNavigation();
  const [name, setName] = useState(props.entry.name);
  const [error, setError] = useState<string | undefined>();
  return (
    <Form
      navigationTitle={`Rename ${props.entry.name}`}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Rename"
            onSubmit={async () => {
              if (!name.trim()) {
                setError("Name cannot be empty");
                return;
              }
              const dest = path.join(
                path.dirname(props.entry.fullPath),
                name.trim(),
              );
              if (dest === props.entry.fullPath) {
                pop();
                return;
              }
              try {
                // Never silently replace another item: renaming onto an
                // existing path destroys it on macOS, so ask first. Identity
                // is by inode WITHOUT following links (lstat): on
                // case-insensitive APFS a case-only rename ("Notes" →
                // "notes", file or link) targets the same entry and must NOT
                // prompt — but a link and its target are different entries,
                // so renaming alias→report.txt still asks.
                let selfRename = false;
                let occupied = false;
                try {
                  const [fromStat, toStat] = await Promise.all([
                    fs.lstat(props.entry.fullPath),
                    fs.lstat(dest),
                  ]);
                  if (
                    fromStat.dev === toStat.dev &&
                    fromStat.ino === toStat.ino
                  ) {
                    selfRename = true;
                  } else {
                    occupied = true;
                  }
                } catch {
                  // Destination doesn't exist (or is unreadable) — free.
                  occupied = false;
                }
                if (occupied && !selfRename) {
                  const replace = await confirmAlert({
                    title: `Replace "${name.trim()}"?`,
                    message: "An item with that name already exists here.",
                    primaryAction: {
                      title: "Replace",
                      style: Alert.ActionStyle.Destructive,
                    },
                  });
                  if (!replace) return;
                }
                await fs.rename(props.entry.fullPath, dest);
                await showToast({
                  style: Toast.Style.Success,
                  title: "Renamed",
                });
                props.onDone();
                pop();
              } catch (e) {
                await showToast({
                  style: Toast.Style.Failure,
                  title: "Rename failed",
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
        title="New name"
        value={name}
        error={error}
        onChange={setName}
      />
    </Form>
  );
}

function NewFolderForm(props: { dir: string; onDone: () => void }) {
  const { pop } = useNavigation();
  const [name, setName] = useState("Untitled Folder");
  const [error, setError] = useState<string | undefined>();
  return (
    <Form
      navigationTitle={`New folder in ${props.dir}`}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Create Folder"
            onSubmit={async () => {
              if (!name.trim()) {
                setError("Name cannot be empty");
                return;
              }
              try {
                await fs.mkdir(path.join(props.dir, name.trim()));
                await showToast({
                  style: Toast.Style.Success,
                  title: "Folder created",
                });
                props.onDone();
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

function NewFileForm(props: { dir: string; onDone: () => void }) {
  const { pop } = useNavigation();
  const [name, setName] = useState("Untitled.txt");
  const [error, setError] = useState<string | undefined>();
  return (
    <Form
      navigationTitle={`New file in ${props.dir}`}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Create File"
            onSubmit={async () => {
              if (!name.trim()) {
                setError("Name cannot be empty");
                return;
              }
              try {
                // Exclusive create: refuse instead of truncating an
                // existing file to empty.
                await fs.writeFile(path.join(props.dir, name.trim()), "", {
                  flag: "wx",
                });
                await showToast({
                  style: Toast.Style.Success,
                  title: "File created",
                });
                props.onDone();
                pop();
              } catch (e) {
                if (
                  typeof e === "object" &&
                  e !== null &&
                  "code" in e &&
                  (e as { code?: string }).code === "EEXIST"
                ) {
                  setError("A file with that name already exists");
                  return;
                }
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
        title="File name"
        value={name}
        error={error}
        onChange={setName}
      />
    </Form>
  );
}

// ---------- Operations (single + batch, with progress) ----------

async function duplicateEntry(entry: FileEntry, onChanged: () => void) {
  const toast = await showToast({
    style: Toast.Style.Animated,
    title: "Duplicating…",
    message: entry.name,
  });
  try {
    const r = await copyManyWithProgress(
      [entry.fullPath],
      path.dirname(entry.fullPath),
      toast,
      "Duplicating",
    );
    if (r.errors.length > 0) {
      toast.style = Toast.Style.Failure;
      toast.title = "Duplicate had errors";
      toast.message = r.errors.slice(0, 3).join("\n");
    } else {
      toast.style = Toast.Style.Success;
      toast.title = "Duplicated";
      toast.message = entry.name;
    }
    onChanged();
  } catch (e) {
    toast.style = Toast.Style.Failure;
    toast.title = "Duplicate failed";
    toast.message = String(e);
  }
}

async function moveToTrash(entry: FileEntry, onChanged: () => void) {
  const ok = await confirmAlert({
    title: `Move "${entry.name}" to Trash?`,
    message: entry.fullPath,
    primaryAction: {
      title: "Move to Trash",
      style: Alert.ActionStyle.Destructive,
    },
  });
  if (!ok) return;
  const { trashed, errors } = await safeTrash([entry.fullPath]);
  removePaths(trashed);
  if (errors.length > 0) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Trash failed",
      message: errors.slice(0, 2).join("\n"),
    });
  } else {
    removePaths([entry.fullPath]);
    await showToast({ style: Toast.Style.Success, title: "Moved to Trash" });
  }
  onChanged();
}

async function trashPaths(fullPaths: string[], onDone: () => void) {
  if (fullPaths.length === 0) return;
  const ok = await confirmAlert({
    title: `Move ${fullPaths.length} item${fullPaths.length === 1 ? "" : "s"} to Trash?`,
    message:
      fullPaths.slice(0, 5).join("\n") +
      (fullPaths.length > 5 ? `\n…+${fullPaths.length - 5} more` : ""),
    primaryAction: {
      title: "Move to Trash",
      style: Alert.ActionStyle.Destructive,
    },
  });
  if (!ok) return;
  const { trashed, errors } = await safeTrash(fullPaths);
  removePaths(trashed);
  if (errors.length > 0) {
    await showToast({
      style: Toast.Style.Failure,
      title: `Trash failed (${errors.length} item${errors.length === 1 ? "" : "s"})`,
      message: errors.slice(0, 2).join("\n"),
    });
  } else {
    await showToast({
      style: Toast.Style.Success,
      title: `Trashed ${trashed.length} item${trashed.length === 1 ? "" : "s"}`,
    });
  }
  onDone();
}

async function compressEntry(entry: FileEntry, onChanged: () => void) {
  const toast = await showToast({
    style: Toast.Style.Animated,
    title: `Compressing ${entry.name}…`,
  });
  try {
    const { dest } = await compressOne(
      entry.fullPath,
      path.dirname(entry.fullPath),
    );
    toast.style = Toast.Style.Success;
    toast.title = "Compressed";
    toast.message = `→ ${path.basename(dest)}`;
    onChanged();
  } catch (e) {
    toast.style = Toast.Style.Failure;
    toast.title = "Compress failed";
    toast.message = shortError(e);
  }
}

async function extractEntry(entry: FileEntry, onChanged: () => void) {
  const toast = await showToast({
    style: Toast.Style.Animated,
    title: `Extracting ${entry.name}…`,
  });
  try {
    await extractZip(entry.fullPath, path.dirname(entry.fullPath));
    toast.style = Toast.Style.Success;
    toast.title = "Extracted";
    toast.message = `→ ${path.dirname(entry.fullPath)}`;
    onChanged();
  } catch (e) {
    toast.style = Toast.Style.Failure;
    toast.title = "Extract failed";
    toast.message = shortError(e);
  }
}

async function compressSelected(
  fullPaths: string[],
  destDir: string,
  onDone: () => void,
) {
  if (fullPaths.length === 0) return;
  const toast = await showToast({
    style: Toast.Style.Animated,
    title: `Compressing ${fullPaths.length} items…`,
  });
  try {
    const { dest } = await compressMany(
      fullPaths,
      destDir,
      archiveDisplayName(fullPaths),
      (done, total, name) => {
        toast.message = `${done}/${total} staged · ${name.slice(0, 60)}`;
      },
    );
    toast.style = Toast.Style.Success;
    toast.title = "Compressed";
    toast.message = `→ ${path.basename(dest)}`;
    onDone();
  } catch (e) {
    toast.style = Toast.Style.Failure;
    toast.title = "Compress failed";
    toast.message = shortError(e);
  }
}
