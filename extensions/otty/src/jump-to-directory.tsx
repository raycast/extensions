import {
  Action,
  ActionPanel,
  Color,
  getPreferenceValues,
  Icon,
  Image,
  Keyboard,
  List,
  openCommandPreferences,
} from "@raycast/api";
import { useCachedPromise, useLocalStorage } from "@raycast/utils";
import { homedir } from "node:os";
import { useState } from "react";
import { loadJumpEntries, openInTab, runOtty } from "./lib/otty";
import { buildOpenDirectoryArgs, splitPinned } from "./lib/otty-core";
import { findRepos, relativeParent } from "./lib/paths";
import { loadRepoInfos, sortByRecent, type RepoInfo } from "./lib/repos";
import { LoadFailureView, runAndClose, useRefreshFailureToast } from "./lib/ui";
import { abbreviateHome, basename, expandHome } from "./lib/workspace";

type Mode = "visited" | "repos";
type Folder = { path: string; last_seen?: number };

export default function Command() {
  const [mode, setMode] = useState<Mode>("visited");
  const { repositoriesDirectory, repositoriesScanDepth } = getPreferenceValues<Preferences.JumpToDirectory>();
  const home = homedir();
  const reposRoot = expandHome(repositoriesDirectory, home);

  const jump = useCachedPromise(loadJumpEntries, [], {
    keepPreviousData: true,
    execute: mode === "visited",
    onError: () => {},
  });
  useRefreshFailureToast(jump.error, mode === "visited" && Boolean(jump.data), "Could not refresh jump history");
  const repos = useCachedPromise(findRepos, [reposRoot ?? "", Number(repositoriesScanDepth) || 2], {
    keepPreviousData: true,
    execute: mode === "repos" && Boolean(reposRoot),
  });
  const { value: pinnedPaths = [], setValue: setPinnedPaths } = useLocalStorage<string[]>("pinned-directories", []);

  const repoInfos = useCachedPromise(loadRepoInfos, [repos.data ?? []], {
    keepPreviousData: true,
    execute: mode === "repos" && (repos.data?.length ?? 0) > 0,
  });
  const infos = repoInfos.data ?? {};

  const folders: Folder[] =
    mode === "visited" ? (jump.data ?? []) : sortByRecent(repos.data ?? [], infos).map((path) => ({ path }));
  const { pinned, others } = splitPinned(folders, pinnedPaths);

  const togglePin = (path: string) =>
    setPinnedPaths(
      pinnedPaths.includes(path) ? pinnedPaths.filter((pinnedPath) => pinnedPath !== path) : [...pinnedPaths, path],
    );

  const item = (folder: Folder) => (
    <List.Item
      key={folder.path}
      icon={mode === "repos" ? repoIcon(infos[folder.path]) : Icon.Folder}
      title={basename(folder.path)}
      subtitle={
        // Under the repositories folder, its path is implied: show only the rest.
        mode === "repos" && reposRoot && folder.path.startsWith(`${reposRoot}/`)
          ? relativeParent(folder.path, reposRoot)
          : abbreviateHome(folder.path, home)
      }
      keywords={folder.path.split("/").filter(Boolean)}
      accessories={
        mode === "repos"
          ? repoAccessories(infos[folder.path])
          : folder.last_seen
            ? [
                {
                  date: new Date(folder.last_seen * 1000),
                  tooltip: "Last visited",
                },
              ]
            : undefined
      }
      actions={
        <JumpActions
          path={folder.path}
          isPinned={pinnedPaths.includes(folder.path)}
          onTogglePin={() => togglePin(folder.path)}
        />
      }
    />
  );

  const dropdown = (
    <List.Dropdown
      id="jump-source"
      tooltip="Show"
      storeValue
      onChange={(value) => setMode(value === "repos" ? "repos" : "visited")}
    >
      <List.Dropdown.Item title="Most Visited" value="visited" icon={Icon.Clock} />
      <List.Dropdown.Item title="Repositories" value="repos" icon={Icon.CodeBlock} />
    </List.Dropdown>
  );

  if (mode === "visited" && jump.error && !jump.data) {
    return (
      <List searchBarAccessory={dropdown}>
        <LoadFailureView title="Could Not Read Jump History" error={jump.error} onRetry={jump.revalidate} />
      </List>
    );
  }

  return (
    <List
      isLoading={mode === "visited" ? jump.isLoading : repos.isLoading || repoInfos.isLoading}
      searchBarPlaceholder={mode === "visited" ? "Search folders" : "Search repositories"}
      searchBarAccessory={dropdown}
    >
      {mode === "repos" ? (
        <List.EmptyView
          icon={Icon.CodeBlock}
          title={reposRoot ? "No Repositories Found" : "Choose a Repositories Folder"}
          description={
            reposRoot
              ? `No git repositories within ${repositoriesScanDepth || 2} levels of ${abbreviateHome(reposRoot, home)}.`
              : "Pick the folder to scan for git repositories in preferences."
          }
          actions={
            <ActionPanel>
              <Action title="Open Command Preferences" icon={Icon.Gear} onAction={openCommandPreferences} />
            </ActionPanel>
          }
        />
      ) : (
        <List.EmptyView
          icon={Icon.Folder}
          title="No Jump History"
          description="Otty records folders as you visit them in its terminal."
        />
      )}
      <List.Section title="Pinned">{pinned.map(item)}</List.Section>
      <List.Section title={mode === "visited" ? "Most Visited" : "Repositories"}>{others.map(item)}</List.Section>
    </List>
  );
}

function JumpActions({ path, isPinned, onTogglePin }: { path: string; isPinned: boolean; onTogglePin: () => void }) {
  return (
    <ActionPanel>
      <ActionPanel.Section>
        <Action
          title="Open in New Tab"
          icon={Icon.Plus}
          onAction={() => runAndClose(`Could not open ${path}`, () => openInTab(path))}
        />
        <Action
          title="Open in New Window"
          icon={Icon.AppWindow}
          onAction={() => runAndClose(`Could not open ${path}`, () => runOtty(buildOpenDirectoryArgs(path)))}
        />
      </ActionPanel.Section>
      <ActionPanel.Section>
        <Action.CopyToClipboard title="Copy Path" content={path} shortcut={Keyboard.Shortcut.Common.CopyPath} />
        <Action.ShowInFinder path={path} />
      </ActionPanel.Section>
      <ActionPanel.Section>
        <Action
          title={isPinned ? "Unpin Directory" : "Pin Directory"}
          icon={isPinned ? Icon.TackDisabled : Icon.Tack}
          shortcut={Keyboard.Shortcut.Common.Pin}
          onAction={onTogglePin}
        />
      </ActionPanel.Section>
    </ActionPanel>
  );
}

/** Branch, ahead/behind (only when it differs), and when the last commit landed. */
function repoAccessories(info?: RepoInfo): List.Item.Accessory[] {
  if (!info) return [];
  const accessories: List.Item.Accessory[] = [];
  if (info.changed) {
    accessories.push({
      tag: { value: `${info.changed} changed`, color: Color.Orange },
      tooltip: "Files with uncommitted changes",
    });
  }
  const drift = [info.ahead ? `↑${info.ahead}` : "", info.behind ? `↓${info.behind}` : ""].filter(Boolean).join(" ");
  if (drift) {
    accessories.push({
      text: drift,
      tooltip: `${info.ahead ?? 0} ahead, ${info.behind ?? 0} behind its upstream, as of the last fetch`,
    });
  }
  if (info.branch) {
    accessories.push({ text: info.branch, tooltip: "Branch" });
  }
  if (info.lastCommit) {
    accessories.push({
      date: new Date(info.lastCommit),
      tooltip: "Last commit",
    });
  }
  return accessories;
}

/** The GitHub owner's avatar when `origin` is on github.com, else a folder. */
function repoIcon(info?: RepoInfo): Image.ImageLike {
  return info?.owner
    ? {
        source: `https://github.com/${info.owner}.png?size=64`,
        fallback: Icon.Folder,
        mask: Image.Mask.RoundedRectangle,
      }
    : Icon.Folder;
}
