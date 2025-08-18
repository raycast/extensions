import { Action, ActionPanel, Color, Grid, Icon, open, openExtensionPreferences, showToast, Toast } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { basename, dirname } from "path";
import { useEffect, useState } from "react";
import { runAppleScriptSync } from "run-applescript";
import tildify from "tildify";
import { fileURLToPath } from "url";
import { RemoveMethods, useRecentEntries } from "./db";
import {
  ListOrGrid,
  ListOrGridDropdown,
  ListOrGridDropdownItem,
  ListOrGridDropdownSection,
  ListOrGridEmptyView,
  ListOrGridItem,
  ListOrGridSection,
} from "./grid-or-list";
import { getBuildScheme, getVSCodeCLIFilename } from "./lib/vscode";
import { usePinnedEntries } from "./pinned";
import {
  build,
  bundleIdentifier,
  closeOtherWindows,
  gitBranchColor,
  keepSectionOrder,
  layout,
  showGitBranch,
  terminalApp,
} from "./preferences";
import { EntryLike, EntryType, PinMethods } from "./types";
import {
  filterEntriesByType,
  filterUnpinnedEntries,
  isFileEntry,
  isFolderEntry,
  isRemoteEntry,
  isRemoteWorkspaceEntry,
  isValidHexColor,
  isWin,
  isWorkspaceEntry,
  runExec,
} from "./utils";
import { getEditorApplication } from "./utils/editor";
import { getGitBranch } from "./utils/git";
import { OpenInShell } from "./actions";

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
  props: { entry: EntryLike; uri: string; pinned?: boolean; gridView?: boolean } & PinMethods & RemoveMethods
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
      } catch (error) {
        // Silently handle errors - they're already handled in getGitBranch
      }
    }

    fetchGitBranch();
    return () => {
      mounted = false;
    };
  }, [path, name]);

  const getTitle = (revert = false) => {
    return `Open in ${build} ${closeOtherWindows !== revert ? "and Close Other" : ""}`;
  };

  const getAction = (revert = false) => {
    if (isWin) {
      return () => {
        const cliFilename = getVSCodeCLIFilename();
        const fp = fileURLToPath(props.uri);
        runExec([cliFilename, fp], (error) => {
          if (error) {
            console.error(`Error opening file: ${error}`);
            showToast(Toast.Style.Failure, `Failed to open file: ${error}`);
            return;
          }
        });
      };
    }
    return () => {
      if (closeOtherWindows !== revert) {
        runAppleScriptSync(`
        tell application "System Events"
          tell process "${build}"
            repeat while window 1 exists
              click button 1 of window 1
            end repeat
          end tell
        end tell
        `);
      }
      open(props.uri, bundleIdentifier);
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
            <OpenInShell path={path} />
            <Action
              title={getTitle(true)}
              icon={editorApp ? { fileIcon: editorApp.path } : "action-icon.png"}
              onAction={getAction(true)}
              shortcut={{ modifiers: ["cmd", "shift"], key: "enter" }}
            />
            <Action.OpenWith path={path} shortcut={{ modifiers: ["cmd"], key: "o" }} />
            {isFolderEntry(props.entry) && terminalApp && (
              <Action
                title={`Open with ${terminalApp.name}`}
                icon={{ fileIcon: terminalApp.path }}
                shortcut={{ modifiers: ["cmd", "shift"], key: "o" }}
                onAction={() =>
                  open(path, terminalApp).catch(() =>
                    showToast(Toast.Style.Failure, `Failed to open with ${terminalApp?.name}`)
                  )
                }
              />
            )}
          </ActionPanel.Section>
          <ActionPanel.Section>
            <Action.CopyToClipboard title="Copy Name" content={name} shortcut={{ modifiers: ["cmd"], key: "." }} />
            <Action.CopyToClipboard
              title="Copy Path"
              content={prettyPath}
              shortcut={{ modifiers: ["cmd", "shift"], key: "." }}
            />
          </ActionPanel.Section>
          <RemoveActionSection {...props} />
          <PinActionSection {...props} />
        </ActionPanel>
      }
    />
  );
}

function RemoteItem(
  props: { entry: EntryLike; uri: string; subtitle?: string; pinned?: boolean } & PinMethods & RemoveMethods
) {
  const remotePath = decodeURI(basename(props.uri));
  const scheme = getBuildScheme();

  const uri = props.uri.replace("vscode-remote://", `${scheme}://vscode-remote/`);

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

  return (
    <ListOrGridItem
      id={props.pinned ? remotePath : undefined}
      title={remotePath}
      subtitle={props.subtitle || "/"}
      icon="remote.svg"
      content="remote.svg"
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <Action.OpenInBrowser title={getTitle()} icon="action-icon.png" url={getUrl(uri)} />
            <Action.OpenInBrowser
              title={getTitle(true)}
              icon="action-icon.png"
              url={getUrl(uri, true)}
              shortcut={{ modifiers: ["cmd", "shift"], key: "enter" }}
            />
          </ActionPanel.Section>
          <RemoveActionSection {...props} />
          <PinActionSection {...props} />
          <Action
            title="Open Preferences"
            icon={Icon.Gear}
            onAction={openExtensionPreferences}
            shortcut={{ modifiers: ["cmd"], key: "," }}
          />
        </ActionPanel>
      }
    />
  );
}

function PinActionSection(props: { entry: EntryLike; pinned?: boolean } & PinMethods) {
  const movements = props.getAllowedMovements(props.entry);

  return !props.pinned ? (
    <ActionPanel.Section>
      <Action
        title="Pin Entry"
        icon={Icon.Pin}
        shortcut={{ modifiers: ["cmd", "shift"], key: "p" }}
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
        shortcut={{ modifiers: ["cmd", "shift"], key: "p" }}
        icon={Icon.PinDisabled}
        onAction={async () => {
          props.unpin(props.entry);
          await showToast({ title: "Unpinned entry" });
        }}
      />
      {movements.includes("left") && (
        <Action
          title="Move Left in Pinned Entries"
          shortcut={{ modifiers: ["cmd", "opt"], key: "arrowLeft" }}
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
          shortcut={{ modifiers: ["cmd", "opt"], key: "arrowUp" }}
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
          shortcut={{ modifiers: ["cmd", "opt"], key: "arrowRight" }}
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
          shortcut={{ modifiers: ["cmd", "opt"], key: "arrowDown" }}
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
        shortcut={{ modifiers: ["ctrl", "shift"], key: "x" }}
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
        shortcut={{ modifiers: ["ctrl"], key: "x" }}
      />

      <Action
        icon={Icon.Trash}
        title="Remove All Recent Projects"
        style={Action.Style.Destructive}
        onAction={() => props.removeAllEntries()}
        shortcut={{ modifiers: ["ctrl", "shift"], key: "x" }}
      />
    </ActionPanel.Section>
  );
}
