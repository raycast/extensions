import {
  Action,
  ActionPanel,
  Alert,
  closeMainWindow,
  confirmAlert,
  Icon,
  Keyboard,
  List,
  open,
  showToast,
  Toast,
} from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { ReactNode } from "react";
import os from "node:os";
import path from "node:path";
import { Prefs } from "../lib/prefs";
import { listSubfolders } from "../lib/search";
import { FolderList, useFolderList } from "../lib/storage";
import { openInEditor, openInTerminal, revealInExplorer } from "../lib/system";

/* Shortcuts: Ctrl on Windows, Cmd on macOS (kept for completeness). */
type Mod = "ctrl" | "shift" | "alt";
function key(mods: Mod[], k: Keyboard.KeyEquivalent): Keyboard.Shortcut {
  return {
    Windows: { modifiers: mods, key: k },
    macOS: { modifiers: mods.map((m) => (m === "ctrl" ? "cmd" : m === "alt" ? "opt" : m)), key: k },
  };
}

const SC = {
  reveal: key(["ctrl"], "return"),
  browse: key(["ctrl", "alt"], "arrowDown"),
  parent: key(["ctrl", "alt"], "arrowUp"),
  terminal: key(["ctrl", "shift"], "t"),
  editor: key(["ctrl", "shift"], "o"),
  copyPath: key(["ctrl", "shift"], "c"),
  copyName: key(["ctrl", "alt"], "c"),
  paste: key(["ctrl", "shift"], "v"),
  pin: key(["ctrl", "shift"], "p"),
  moveUp: key(["ctrl", "shift"], "arrowUp"),
  moveDown: key(["ctrl", "shift"], "arrowDown"),
  removeRecent: key(["ctrl", "shift"], "r"),
};

const home = os.homedir();
export function prettyPath(p: string) {
  return p.toLowerCase().startsWith(home.toLowerCase()) ? "~" + p.slice(home.length) : p;
}

function folderName(p: string) {
  return path.win32.basename(p) || p; // drive roots like C:\ have no basename
}

async function attempt(title: string, fn: () => Promise<void>) {
  try {
    await fn();
  } catch (error) {
    await showToast({ style: Toast.Style.Failure, title, message: (error as Error).message });
  }
}

interface FolderItemProps {
  folder: string;
  prefs: Prefs;
  pinned: FolderList;
  recent: FolderList;
  section?: "pinned" | "recent" | "results" | "browse";
  extraActions?: ReactNode;
}

export function FolderItem({ folder, prefs, pinned, recent, section = "results", extraActions }: FolderItemProps) {
  const isPinned = pinned.has(folder);
  const parent = path.win32.dirname(folder);
  const hasParent = parent !== folder;

  const markUsed = () => recent.add(folder);

  return (
    <List.Item
      title={folderName(folder)}
      subtitle={hasParent ? prettyPath(parent) : undefined}
      icon={Icon.Folder}
      keywords={folder.split(/[\\/]/)}
      accessories={isPinned && section !== "pinned" ? [{ icon: Icon.Pin, tooltip: "Pinned" }] : []}
      actions={
        <ActionPanel>
          <ActionPanel.Section title={folderName(folder)}>
            <Action
              title="Open in Explorer"
              icon={Icon.Folder}
              onAction={() =>
                attempt("Could not open folder", async () => {
                  await open(folder);
                  await markUsed();
                  await closeMainWindow({ clearRootSearch: true });
                })
              }
            />
            <Action
              title="Show in Explorer"
              icon={Icon.Eye}
              shortcut={SC.reveal}
              onAction={() =>
                attempt("Could not open Explorer", async () => {
                  await revealInExplorer(folder);
                  await markUsed();
                  await closeMainWindow({ clearRootSearch: true });
                })
              }
            />
            <Action.Push
              title="Browse Folder"
              icon={Icon.ArrowDown}
              shortcut={SC.browse}
              target={<FolderContents dir={folder} prefs={prefs} />}
            />
            {hasParent && (
              <Action.Push
                title="Go to Enclosing Folder"
                icon={Icon.ArrowUp}
                shortcut={SC.parent}
                target={<FolderContents dir={parent} prefs={prefs} />}
              />
            )}
          </ActionPanel.Section>

          <ActionPanel.Section title="Open With">
            <Action
              title="Open in Terminal"
              icon={Icon.Terminal}
              shortcut={SC.terminal}
              onAction={() =>
                attempt("Could not open terminal", async () => {
                  await openInTerminal(folder, prefs.terminal);
                  await markUsed();
                  await closeMainWindow({ clearRootSearch: true });
                })
              }
            />
            <Action
              title={`Open in Editor (${prefs.editorCommand})`}
              icon={Icon.Code}
              shortcut={SC.editor}
              onAction={() =>
                attempt("Could not open editor", async () => {
                  await openInEditor(folder, prefs.editorCommand);
                  await markUsed();
                  await closeMainWindow({ clearRootSearch: true });
                })
              }
            />
          </ActionPanel.Section>

          <ActionPanel.Section title="Copy">
            <Action.CopyToClipboard title="Copy Path" content={folder} shortcut={SC.copyPath} />
            <Action.CopyToClipboard title="Copy Name" content={folderName(folder)} shortcut={SC.copyName} />
            <Action.Paste title="Paste Path" content={folder} shortcut={SC.paste} />
          </ActionPanel.Section>

          <ActionPanel.Section title="Organize">
            <Action
              title={isPinned ? "Unpin Folder" : "Pin Folder"}
              icon={isPinned ? Icon.PinDisabled : Icon.Pin}
              shortcut={SC.pin}
              onAction={async () => {
                if (isPinned) await pinned.remove(folder);
                else await pinned.add(folder);
                await showToast({ title: isPinned ? "Unpinned" : "Pinned", message: folderName(folder) });
              }}
            />
            {section === "pinned" && (
              <>
                <Action
                  title="Move up"
                  icon={Icon.ChevronUp}
                  shortcut={SC.moveUp}
                  onAction={() => pinned.move(folder, -1)}
                />
                <Action
                  title="Move Down"
                  icon={Icon.ChevronDown}
                  shortcut={SC.moveDown}
                  onAction={() => pinned.move(folder, 1)}
                />
              </>
            )}
            {section === "recent" && (
              <>
                <Action
                  title="Remove from Recent"
                  icon={Icon.XMarkCircle}
                  shortcut={SC.removeRecent}
                  onAction={() => recent.remove(folder)}
                />
                <Action
                  title="Clear Recent"
                  icon={Icon.Trash}
                  style={Action.Style.Destructive}
                  onAction={async () => {
                    const ok = await confirmAlert({
                      title: "Clear recent folders?",
                      primaryAction: { title: "Clear", style: Alert.ActionStyle.Destructive },
                    });
                    if (ok) await recent.clear();
                  }}
                />
              </>
            )}
          </ActionPanel.Section>
          {extraActions && <ActionPanel.Section>{extraActions}</ActionPanel.Section>}
        </ActionPanel>
      }
    />
  );
}

/** Lists the direct subfolders of `dir`; Raycast's built-in filtering narrows them as you type. */
export function FolderContents({ dir, prefs }: { dir: string; prefs: Prefs }) {
  const pinned = useFolderList("pinned");
  const recent = useFolderList("recent", 20);
  const { data, isLoading, error } = usePromise(listSubfolders, [dir], {
    failureToastOptions: { title: "Could not read folder" },
  });

  const parent = path.win32.dirname(dir);

  return (
    <List
      isLoading={isLoading}
      navigationTitle={folderName(dir)}
      searchBarPlaceholder={`Filter in ${folderName(dir)}…`}
    >
      {error ? (
        <List.EmptyView icon={Icon.ExclamationMark} title="Folder not accessible" description={error.message} />
      ) : (
        <List.EmptyView
          icon={Icon.Folder}
          title="No subfolders"
          actions={
            <ActionPanel>
              <Action title="Open in Explorer" icon={Icon.Folder} onAction={() => open(dir)} />
              {parent !== dir && (
                <Action.Push
                  title="Go to Enclosing Folder"
                  icon={Icon.ArrowUp}
                  target={<FolderContents dir={parent} prefs={prefs} />}
                />
              )}
            </ActionPanel>
          }
        />
      )}
      <List.Section title={prettyPath(dir)} subtitle={data ? String(data.length) : undefined}>
        {data?.map((p) => (
          <FolderItem key={p} folder={p} prefs={prefs} pinned={pinned} recent={recent} section="browse" />
        ))}
      </List.Section>
    </List>
  );
}
