import { Action, ActionPanel, Color, Grid, Icon, open, openExtensionPreferences, showToast, Toast } from "@raycast/api";
import { runAppleScript, runPowerShellScript, usePromise } from "@raycast/utils";
import { basename, dirname } from "path";
import { useEffect, useState } from "react";
import tildify from "tildify";
import { fileURLToPath } from "url";
import { RemoveMethods, useRecentEntries } from "./lib/db";
import {
  ListOrGrid,
  ListOrGridDropdown,
  ListOrGridDropdownItem,
  ListOrGridDropdownSection,
  ListOrGridEmptyView,
  ListOrGridItem,
  ListOrGridSection,
} from "./lib/grid-or-list";
import { getBuildScheme, getVSCodeCLI } from "./lib/vscode";
import { usePinnedEntries } from "./lib/pinned";
import {
  build,
  closeOtherWindows,
  gitBranchColor,
  keepSectionOrder,
  layout,
  showGitBranch,
  terminalApp,
} from "./lib/preferences";
import { EntryLike, EntryType, PinMethods } from "./lib/types";
import {
  filterEntriesByType,
  filterUnpinnedEntries,
  getErrorMessage,
  isFileEntry,
  isFolderEntry,
  isRemoteEntry,
  isRemoteWorkspaceEntry,
  isValidHexColor,
  isWin,
  isWorkspaceEntry,
  openPathInVSCode,
} from "./lib/utils";
import { Shortcut } from "./lib/shortcuts";
import { getEditorApplication } from "./utils/editor";
import { getGitBranch } from "./utils/git";
import { OpenInShell } from "./lib/actions";

export default function Command() {
  const { data, isLoading, error, ...removeMethods } = useRecentEntries();
  const [type, setType] = useState<EntryType | null>(null);
  const { pinnedEntries, ...pinnedMethods } = usePinnedEntries();

  if (error) {
    showToast(Toast.Style.Failure, "Failed to load recent projects");
    return (
      <ListOrGrid
        actions={
          <ActionPanel>
            <Action title="Change Build" onAction={openExtensionPreferences} />
          </ActionPanel>
        }
      >
        <ListOrGridEmptyView
          title="Failed to load recent projects"
          description="Press enter to change build"
        ></ListOrGridEmptyView>
      </ListOrGrid>
    );
  }

  return (
    <ListOrGrid
      columns={6}
      inset={Grid.Inset.Medium}
      searchBarPlaceholder="Search recent projects..."
      isLoading={isLoading}
      filtering={{ keepSectionOrder }}
      searchBarAccessory={<EntryTypeDropdown onChange={setType} />}
    >
      <ListOrGridSection title="Pinned Projects">
        {pinnedEntries.filter(filterEntriesByType(type)).map((entry: EntryLike, index: number) => (
          <EntryItem key={`pinned-${index}`} entry={entry} pinned={true} {...pinnedMethods} {...removeMethods} />
        ))}
      </ListOrGridSection>
      <ListOrGridSection title="Recent Projects">
        {data
          ?.filter(filterUnpinnedEntries(pinnedEntries))
          ?.filter(filterEntriesByType(type))
          .map((entry: EntryLike, index: number) => (
            <EntryItem key={index} entry={entry} {...pinnedMethods} {...removeMethods} />
          ))}
      </ListOrGridSection>
    </ListOrGrid>
  );
}

function EntryTypeDropdown(props: { onChange: (type: EntryType) => void }) {
  return (
    <ListOrGridDropdown
      tooltip="Filter project types"
      defaultValue={EntryType.AllTypes}
      storeValue
      onChange={(value) => props.onChange(value as EntryType)}
    >
      <ListOrGridDropdownItem title="All Types" value="All Types" />
      <ListOrGridDropdownSection>
        {Object.values(EntryType)
          .filter((key) => key !== "All Types")
          .sort()
          .map((key) => (
            <ListOrGridDropdownItem key={key} title={key} value={key} />
          ))}
      </ListOrGridDropdownSection>
    </ListOrGridDropdown>
  );
}

function EntryItem(props: { entry: EntryLike; pinned?: boolean } & PinMethods & RemoveMethods) {
  if (isWorkspaceEntry(props.entry)) {
    return <LocalItem {...props} uri={props.entry.workspace.configPath} />;
  } else if (isFolderEntry(props.entry)) {
    return <LocalItem {...props} uri={props.entry.folderUri} />;
  } else if (isRemoteEntry(props.entry)) {
    return (
      <RemoteItem
        {...props}
        uri={props.entry.folderUri}
        subtitle={props.entry.label}
        entry={props.entry}
        pinned={props.pinned}
      />
    );
  } else if (isRemoteWorkspaceEntry(props.entry)) {
    return (
      <RemoteItem
        {...props}
        uri={props.entry.workspace.configPath}
        subtitle={props.entry.label}
        entry={props.entry}
        pinned={props.pinned}
      />
    );
  } else if (isFileEntry(props.entry)) {
    return <LocalItem {...props} uri={props.entry.fileUri} />;
  } else {
    return null;
  }
}

function LocalItem(
  props: { entry: EntryLike; uri: string; pinned?: boolean; gridView?: boolean } & PinMethods & RemoveMethods,
) {
  const name = decodeURIComponent(basename(props.uri));
  const path = fileURLToPath(props.uri);
  const prettyPath = tildify(path);
  const subtitle = dirname(prettyPath);
  const keywords = path.split("/");
  const [gitBranch, setGitBranch] = useState<string | null>(null);

  const { data: editorApp } = usePromise(async () => {
    return getEditorApplication(build);
  });

  useEffect(() => {
    let mounted = true;

    async function fetchGitBranch() {
      try {
        const branch = await getGitBranch(path);
        if (mounted) {
          setGitBranch(branch);
        }
      } catch {
        // Silently handle errors - they're already handled in getGitBranch
      }
    }

    if (showGitBranch) {
      fetchGitBranch();
    }
    return () => {
      mounted = false;
    };
  }, [path, name]);

  const getTitle = (revert = false) => {
    return `Open in ${build} ${closeOtherWindows !== revert ? "and Close Other" : ""}`;
  };

  const getAction = (revert = false) => {
    return async () => {
      if (closeOtherWindows !== revert) {
        if (isWin) {
          await runPowerShellScript(`
        $AppName = "${build}"

        while (Get-Process -Name $AppName -ErrorAction SilentlyContinue | Where-Object {$_.MainWindowTitle}) {
          Get-Process -Name $AppName | Where-Object {$_.MainWindowTitle} | Select-Object -First 1 | ForEach-Object {$_.CloseMainWindow()}
        }
          `);
        } else {
          await runAppleScript(`
        tell application "System Events"
          tell process "${build}"
            repeat while window 1 exists
              click button 1 of window 1
            end repeat
          end tell
        end tell
        `);
        }
      }

      if (isWin) {
        if (isWorkspaceEntry(props.entry)) {
          open(props.uri, editorApp);
        } else {
          await openPathInVSCode(path);
        }
      } else {
        open(props.uri, editorApp);
      }
    };
  };

  const accessories = [];
  if (showGitBranch && gitBranch) {
    const branchColor =
      gitBranchColor && isValidHexColor(gitBranchColor)
        ? { light: gitBranchColor, dark: gitBranchColor, adjustContrast: false }
        : Color.Green;
    accessories.push({
      tag: {
        value: gitBranch,
        color: branchColor,
      },
      tooltip: `Git Branch: ${gitBranch}`,
    });
  }

  const displaySubtitle = showGitBranch && gitBranch && layout === "grid" ? `${gitBranch} • ${subtitle}` : subtitle;

  return (
    <ListOrGridItem
      id={props.pinned ? path : undefined}
      title={name}
      subtitle={displaySubtitle}
      icon={{ fileIcon: path }}
      content={{ fileIcon: path }}
      keywords={keywords}
      accessories={accessories}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <Action
              title={getTitle()}
              icon={editorApp ? { fileIcon: editorApp.path } : "action-icon.png"}
              onAction={getAction()}
            />
            <OpenInShell path={path} shortcut={Shortcut.RevealInFileManager} />
            <Action
              title={getTitle(true)}
              icon={editorApp ? { fileIcon: editorApp.path } : "action-icon.png"}
              onAction={getAction(true)}
              shortcut={Shortcut.AlternateOpen}
            />
            <Action.OpenWith path={path} shortcut={Shortcut.OpenWith} />
            {isFolderEntry(props.entry) && terminalApp && (
              <Action
                title={`Open with ${terminalApp.name}`}
                icon={{ fileIcon: terminalApp.path }}
                shortcut={Shortcut.OpenInTerminal}
                onAction={() =>
                  open(path, terminalApp).catch(() =>
                    showToast(Toast.Style.Failure, `Failed to open with ${terminalApp?.name}`),
                  )
                }
              />
            )}
          </ActionPanel.Section>
          <ActionPanel.Section>
            <Action.CopyToClipboard title="Copy Name" content={name} shortcut={Shortcut.Copy} />
            <Action.CopyToClipboard title="Copy Path" content={prettyPath} shortcut={Shortcut.CopySecondary} />
          </ActionPanel.Section>
          <RemoveActionSection {...props} />
          <PinActionSection {...props} />
        </ActionPanel>
      }
    />
  );
}

function RemoteItem(
  props: { entry: EntryLike; uri: string; subtitle?: string; pinned?: boolean } & PinMethods & RemoveMethods,
) {
  const remoteDisplay = getRemoteDisplay(props.entry, props.uri, props.subtitle);
  const remoteIconPath = getRemoteFileIconPath(props.uri, getEntryRemoteAuthority(props.entry));
  const scheme = getBuildScheme();

  const uri = props.uri.replace("vscode-remote://", `${scheme}://vscode-remote/`);

  let keywords: string[] = [];
  if (isRemoteEntry(props.entry)) {
    keywords = props.entry.remoteAuthority.split("+");
  } else if (isRemoteWorkspaceEntry(props.entry)) {
    keywords = props.entry.remoteAuthority.split("+");
  }

  const getTitle = (revert = false) => {
    return `Open in ${build} ${closeOtherWindows !== revert ? "and Close Other" : ""}`;
  };

  const getUrl = (uri: string, revert = false) => {
    const url = new URL(uri);
    if (closeOtherWindows !== revert) {
      // close other windows
      url.searchParams.delete("windowId");
    } else {
      // don't close other windows
      url.searchParams.set("windowId", "_blank");
    }
    return url.toString();
  };

  const openRemoteInWindows = async (revert = false) => {
    try {
      const cli = getVSCodeCLI();
      const reuseWindow = closeOtherWindows !== revert;

      if (isRemoteWorkspaceEntry(props.entry)) {
        cli.openFileURISync(props.uri, reuseWindow);
        return;
      }

      cli.openFolderURISync(props.uri, reuseWindow);
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: `Failed to open in ${build}`,
        message: getErrorMessage(error),
      });
    }
  };

  return (
    <ListOrGridItem
      id={props.pinned ? props.uri : undefined}
      title={remoteDisplay.title}
      subtitle={remoteDisplay.subtitle}
      icon={remoteIconPath ? { fileIcon: remoteIconPath } : Icon.Folder}
      content={remoteIconPath ? { fileIcon: remoteIconPath } : Icon.Folder}
      keywords={keywords}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            {isWin ? (
              <>
                <Action title={getTitle()} icon="action-icon.png" onAction={() => openRemoteInWindows()} />
                <Action
                  title={getTitle(true)}
                  icon="action-icon.png"
                  onAction={() => openRemoteInWindows(true)}
                  shortcut={Shortcut.AlternateOpen}
                />
              </>
            ) : (
              <>
                <Action.OpenInBrowser title={getTitle()} icon="action-icon.png" url={getUrl(uri)} />
                <Action.OpenInBrowser
                  title={getTitle(true)}
                  icon="action-icon.png"
                  url={getUrl(uri, true)}
                  shortcut={Shortcut.AlternateOpen}
                />
              </>
            )}
          </ActionPanel.Section>
          <RemoveActionSection {...props} />
          <PinActionSection {...props} />
          <Action title="Open Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
        </ActionPanel>
      }
    />
  );
}

function getRemoteDisplay(entry: EntryLike, uri: string, subtitle?: string) {
  const fallbackTitle = getRemoteBasename(uri);

  if (subtitle) {
    return {
      title: fallbackTitle,
      subtitle,
    };
  }

  const remoteAuthority = getEntryRemoteAuthority(entry);

  try {
    const remoteUri = new URL(uri);
    const remotePath = decodeURIComponent(remoteUri.pathname);
    const remoteName = basename(remotePath);
    const remoteParentPath = dirname(remotePath);

    return {
      title: remoteAuthority ? `${remoteName} [${formatRemoteAuthority(remoteAuthority)}]` : remoteName,
      subtitle: formatRemotePath(remoteParentPath, remoteAuthority),
    };
  } catch {
    return {
      title: remoteAuthority ? `${fallbackTitle} [${formatRemoteAuthority(remoteAuthority)}]` : fallbackTitle,
      subtitle: "/",
    };
  }
}

function getRemoteBasename(uri: string) {
  try {
    return decodeURI(basename(uri));
  } catch {
    return basename(uri);
  }
}

function getEntryRemoteAuthority(entry: EntryLike) {
  if (isRemoteEntry(entry)) {
    return entry.remoteAuthority;
  }

  if (isRemoteWorkspaceEntry(entry)) {
    return entry.remoteAuthority;
  }

  return undefined;
}

function formatRemoteAuthority(remoteAuthority: string) {
  if (remoteAuthority.startsWith("wsl+")) {
    return `WSL: ${capitalizeLabel(remoteAuthority.slice(4))}`;
  }

  if (remoteAuthority.startsWith("ssh-remote+")) {
    return `SSH: ${remoteAuthority.slice("ssh-remote+".length)}`;
  }

  return remoteAuthority;
}

function formatRemotePath(remotePath: string, remoteAuthority?: string) {
  if (remoteAuthority?.startsWith("wsl+")) {
    const match = remotePath.match(/^\/home\/[^/]+/);
    const homePrefix = match?.[0];

    if (homePrefix && remotePath === homePrefix) {
      return "~";
    }

    if (homePrefix && remotePath.startsWith(`${homePrefix}/`)) {
      return remotePath.replace(homePrefix, "~");
    }
  }

  return remotePath || "/";
}

function capitalizeLabel(value: string) {
  return value.length > 0 ? value[0].toUpperCase() + value.slice(1) : value;
}

function getRemoteFileIconPath(uri: string, remoteAuthority: string | undefined) {
  if (!isWin || !remoteAuthority?.startsWith("wsl+")) {
    return undefined;
  }

  try {
    const remoteUri = new URL(uri);
    const distro = decodeURIComponent(remoteAuthority.slice(4));
    const remotePath = decodeURIComponent(remoteUri.pathname).replace(/\//g, "\\");
    return `\\\\wsl.localhost\\${distro}${remotePath}`;
  } catch {
    return undefined;
  }
}

function PinActionSection(props: { entry: EntryLike; pinned?: boolean } & PinMethods) {
  const movements = props.getAllowedMovements(props.entry);

  return !props.pinned ? (
    <ActionPanel.Section>
      <Action
        title="Pin Entry"
        icon={Icon.Pin}
        shortcut={Shortcut.Pin}
        onAction={async () => {
          props.pin(props.entry);
          await showToast({ title: "Pinned entry" });
        }}
      />
    </ActionPanel.Section>
  ) : (
    <ActionPanel.Section>
      <Action
        title="Unpin Entry"
        shortcut={Shortcut.Pin}
        icon={Icon.PinDisabled}
        onAction={async () => {
          props.unpin(props.entry);
          await showToast({ title: "Unpinned entry" });
        }}
      />
      {movements.includes("left") && (
        <Action
          title="Move Left in Pinned Entries"
          shortcut={Shortcut.MoveLeft}
          icon={Icon.ArrowLeft}
          onAction={async () => {
            props.moveUp(props.entry);
            await showToast({ title: "Moved pinned entry left" });
          }}
        />
      )}
      {movements.includes("up") && (
        <Action
          title="Move up in Pinned Entries"
          shortcut={Shortcut.MoveUp}
          icon={Icon.ArrowUp}
          onAction={async () => {
            props.moveUp(props.entry);
            await showToast({ title: "Moved pinned entry up" });
          }}
        />
      )}
      {movements.includes("right") && (
        <Action
          title="Move Right in Pinned Entries"
          shortcut={Shortcut.MoveRight}
          icon={Icon.ArrowRight}
          onAction={async () => {
            props.moveDown(props.entry);
            await showToast({ title: "Moved pinned entry right" });
          }}
        />
      )}
      {movements.includes("down") && (
        <Action
          title="Move Down in Pinned Entries"
          shortcut={Shortcut.MoveDown}
          icon={Icon.ArrowDown}
          onAction={async () => {
            props.moveDown(props.entry);
            await showToast({ title: "Moved pinned entry down" });
          }}
        />
      )}
      <Action
        title="Unpin All Entries"
        icon={Icon.PinDisabled}
        shortcut={Shortcut.UnpinAll}
        style={Action.Style.Destructive}
        onAction={async () => {
          props.unpinAll();
          await showToast({ title: "Unpinned all entries" });
        }}
      />
    </ActionPanel.Section>
  );
}

function RemoveActionSection(props: { entry: EntryLike } & RemoveMethods) {
  return (
    <ActionPanel.Section>
      <Action
        icon={Icon.Trash}
        title="Remove from Recent Projects"
        style={Action.Style.Destructive}
        onAction={() => props.removeEntry(props.entry)}
        shortcut={Shortcut.Remove}
      />

      <Action
        icon={Icon.Trash}
        title="Remove All Recent Projects"
        style={Action.Style.Destructive}
        onAction={() => props.removeAllEntries()}
        shortcut={Shortcut.RemoveAll}
      />
    </ActionPanel.Section>
  );
}
