import { useEffect, useMemo, useState } from "react";
import {
  Action,
  ActionPanel,
  Icon,
  List,
  Toast,
  open,
  showToast,
  useNavigation,
} from "@raycast/api";
import { usePromise } from "@raycast/utils";
import * as path from "node:path";
import * as os from "node:os";
import { expandHome, listDir, parentDir } from "./fs-utils";
import { fuzzyScore } from "./fuzzy";

const APP_FAVORITES = [
  { title: "Applications", path: "/Applications" },
  { title: "User Applications", path: path.join(os.homedir(), "Applications") },
  { title: "System Applications", path: "/System/Applications" },
];

function appDisplayName(fullPath: string): string {
  const base = path.basename(fullPath);
  return base.endsWith(".app") ? base.slice(0, -4) : base;
}

function isAppBundle(fullPath: string): boolean {
  return fullPath.endsWith(".app");
}

/**
 * Open With picker: browse /Applications (and friends) to choose the app
 * that opens a specific file or folder. Type to fuzzy-find
 * ("vsc" finds Visual Studio Code), Enter opens with the highlighted app,
 * ←/→ navigate subfolders like Utilities. Esc cancels.
 */
export function AppPicker(props: { filePath: string }) {
  const { pop } = useNavigation();
  const { filePath } = props;
  const fileName = path.basename(filePath);
  const [currentPath, setCurrentPath] = useState("/Applications");
  const [searchText, setSearchText] = useState("");
  const [highlightId, setHighlightId] = useState<string | undefined>(undefined);

  const { data, isLoading } = usePromise(
    async (dir: string) => {
      try {
        // Apps are bundles (directories); plain files are hidden and
        // unreadable roots resolve to an empty list with a toast.
        const all = await listDir(dir, false);
        return all.filter((e) => e.isDirectory);
      } catch {
        await showToast({
          style: Toast.Style.Failure,
          title: "Cannot read folder",
          message: dir,
        });
        return [];
      }
    },
    [currentPath],
  );

  const entries = useMemo(() => data ?? [], [data]);
  const visible = useMemo(() => {
    const q = searchText.trim();
    if (!q) return entries;
    return entries
      .map((e) => ({
        entry: e,
        score: fuzzyScore(q, appDisplayName(e.fullPath)),
      }))
      .filter(
        (x): x is { entry: (typeof entries)[number]; score: number } =>
          x.score !== null,
      )
      .sort((a, b) => b.score - a.score)
      .map((x) => x.entry);
  }, [entries, searchText]);

  // Release the programmatic highlight once it has landed on a rendered
  // row (same pattern as the browser: holding it would re-center the list
  // on every arrow key; releasing before it exists drops the landing).
  useEffect(() => {
    if (highlightId === undefined) return;
    if (!entries.some((e) => e.fullPath === highlightId)) return;
    const t = setTimeout(() => setHighlightId(undefined), 350);
    return () => clearTimeout(t);
  }, [highlightId, entries]);

  const crumbs = currentPath.replace(/^\/Users\/[^/]+/, "~");

  function enter(dir: string) {
    setSearchText("");
    setHighlightId(undefined);
    setCurrentPath(dir);
  }

  function goUp() {
    if (currentPath === parentDir(currentPath)) return;
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

  async function openWith(appPath: string) {
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: `Opening ${fileName}…`,
      message: `with ${appDisplayName(appPath)}`,
    });
    try {
      await open(filePath, appPath);
      toast.style = Toast.Style.Success;
      toast.title = "Opened";
      toast.message = `${fileName} → ${appDisplayName(appPath)}`;
      pop();
    } catch (e) {
      toast.style = Toast.Style.Failure;
      toast.title = "Open failed";
      toast.message = String(e);
    }
  }

  return (
    <List
      isLoading={isLoading}
      navigationTitle={`Open With → ${crumbs}`}
      searchBarPlaceholder={`Open ${fileName} with… (type to find)`}
      searchText={searchText}
      onSearchTextChange={setSearchText}
      filtering={false}
      selectedItemId={highlightId}
      onSelectionChange={(id) => {
        if (id) setHighlightId(undefined);
      }}
    >
      <List.Section
        title={`Choose an app for ${fileName}`}
        subtitle={`${visible.length} apps`}
      >
        {visible.map((entry) =>
          isAppBundle(entry.fullPath) ? (
            <List.Item
              key={entry.fullPath}
              id={entry.fullPath}
              title={appDisplayName(entry.fullPath)}
              subtitle="Application"
              icon={{ fileIcon: entry.fullPath }}
              keywords={[appDisplayName(entry.fullPath)]}
              actions={
                <ActionPanel>
                  <Action
                    title="Open with This App"
                    icon={Icon.ArrowRight}
                    onAction={() => openWith(entry.fullPath)}
                  />
                  <Action
                    title="Go up"
                    icon={Icon.ArrowLeft}
                    shortcut={{ modifiers: [], key: "arrowLeft" }}
                    onAction={goUp}
                  />
                  <Action
                    title="Cancel"
                    icon={Icon.XMarkCircle}
                    onAction={() => pop()}
                  />
                  <ActionPanel.Section title="Go">
                    {APP_FAVORITES.map((f) => (
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
              subtitle="Folder — → to enter"
              icon={Icon.Folder}
              keywords={[entry.name]}
              actions={
                <ActionPanel>
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
                  <Action
                    title="Cancel"
                    icon={Icon.XMarkCircle}
                    onAction={() => pop()}
                  />
                </ActionPanel>
              }
            />
          ),
        )}
      </List.Section>
      {visible.length === 0 && !isLoading ? (
        <List.EmptyView
          icon={Icon.AppWindow}
          title="No apps here"
          description="Go up or jump to another Applications folder"
          actions={
            <ActionPanel>
              <Action
                title="Go up"
                icon={Icon.ArrowLeft}
                shortcut={{ modifiers: [], key: "arrowLeft" }}
                onAction={goUp}
              />
              <ActionPanel.Section title="Go">
                {APP_FAVORITES.map((f) => (
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
      ) : null}
    </List>
  );
}
