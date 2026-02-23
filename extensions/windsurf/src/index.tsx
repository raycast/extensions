import {
  ActionPanel,
  Action,
  Grid,
  Icon,
  showToast,
  open,
  closeMainWindow,
  Toast,
  LaunchProps,
  Color,
} from "@raycast/api";
import { useEffect, useState } from "react";
import { basename, dirname } from "path";
import tildify from "tildify";
import { fileURLToPath } from "url";
import { useRecentEntries } from "./database";
import type { RemoveMethods } from "./database";
import {
  keepSectionOrder,
  terminalApp,
  showGitBranch,
  gitBranchColor,
  layout,
} from "./preferences";
import { EntryType } from "./types";
import type { EntryLike, PinMethods } from "./types";
import type { LaunchContext } from "./contexts/ProjectContext";
import {
  filterEntriesByType,
  filterUnpinnedEntries,
  isFileEntry,
  isFolderEntry,
  isRemoteEntry,
  isRemoteWorkspaceEntry,
  isValidHexColor,
  isWorkspaceEntry,
} from "./utils";
import {
  ListOrGrid,
  ListOrGridDropdown,
  ListOrGridDropdownSection,
  ListOrGridDropdownItem,
  ListOrGridSection,
  ListOrGridItem,
} from "./grid-or-list";
import { usePinnedEntries } from "./pinned";
import { ProjectProvider, useProject } from "./contexts/ProjectContext";
import { getGitBranch } from "./utils/git";

export default function Command(
  props: LaunchProps<{ launchContext?: LaunchContext }>
) {
  const { data, isLoading, error, ...removeMethods } = useRecentEntries();
  const [type, setType] = useState<EntryType | null>(null);
  const pinnedEntries = usePinnedEntries();

  if (error) {
    console.log(error);
    showToast(Toast.Style.Failure, "Failed to load recent projects");
  }

  return (
    <ProjectProvider launchContext={props.launchContext}>
      <ListOrGrid
        columns={6}
        inset={Grid.Inset.Medium}
        searchBarPlaceholder="Search recent projects..."
        isLoading={isLoading}
        filtering={{ keepSectionOrder }}
        searchBarAccessory={<EntryTypeDropdown onChange={setType} />}
      >
        <ListOrGridSection title="Pinned Projects">
          {pinnedEntries
            .filter(filterEntriesByType(type))
            .map((entry: EntryLike, index: number) => (
              <EntryItem
                key={`pinned-${index}`}
                entry={entry}
                pinned={true}
                {...pinnedEntries}
                {...removeMethods}
              />
            ))}
        </ListOrGridSection>
        <ListOrGridSection title="Recent Projects">
          {data
            ?.filter(filterUnpinnedEntries(pinnedEntries))
            ?.filter(filterEntriesByType(type))
            .map((entry: EntryLike, index: number) => (
              <EntryItem
                key={index}
                entry={entry}
                {...pinnedEntries}
                {...removeMethods}
              />
            ))}
        </ListOrGridSection>
      </ListOrGrid>
    </ProjectProvider>
  );
}

function EntryTypeDropdown(props: {
  onChange: (type: EntryType | null) => void;
}) {
  return (
    <ListOrGridDropdown
      tooltip="Filter project types"
      defaultValue={EntryType.AllTypes}
      storeValue
      onChange={(value) => props.onChange(value as EntryType)}
    >
      <ListOrGridDropdownItem title="All Types" value={EntryType.AllTypes} />
      <ListOrGridDropdownSection>
        {Object.values(EntryType)
          .filter((key) => key !== EntryType.AllTypes)
          .sort()
          .map((key) => (
            <ListOrGridDropdownItem key={key} title={key} value={key} />
          ))}
      </ListOrGridDropdownSection>
    </ListOrGridDropdown>
  );
}

function EntryItem(
  props: { entry: EntryLike; pinned?: boolean } & PinMethods & RemoveMethods
) {
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
  props: { entry: EntryLike; uri: string; pinned?: boolean } & PinMethods &
    RemoveMethods
) {
  const name = decodeURIComponent(basename(props.uri));
  const path = fileURLToPath(props.uri);
  const prettyPath = tildify(path);
  const subtitle = dirname(prettyPath);
  const keywords = path.split("/");
  const [gitBranch, setGitBranch] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    async function fetchGitBranch() {
      try {
        const branch = await getGitBranch(path);
        if (mounted) {
          setGitBranch(branch);
        }
      } catch {
        // Silently handle errors
      }
    }

    fetchGitBranch();
    return () => {
      mounted = false;
    };
  }, [path, name]);

  const getTitle = (openInNewWindow = true) => {
    return openInNewWindow
      ? "Open in New Windsurf Window"
      : "Open in Current Windsurf Window";
  };

  const { openProject } = useProject();

  const handleOpenProject = (openInNewWindow = true) => {
    openProject(props.uri, openInNewWindow);
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

  const displaySubtitle =
    showGitBranch && gitBranch && layout === "grid"
      ? `${gitBranch} • ${subtitle}`
      : subtitle;

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
              icon="action-icon.png"
              onAction={() => handleOpenProject()}
            />
            <Action.ShowInFinder path={path} />
            <Action
              title={getTitle(false)}
              icon="action-icon.png"
              onAction={() => handleOpenProject(false)}
              shortcut={{ modifiers: ["cmd", "shift"], key: "enter" }}
            />
            <Action.OpenWith
              path={path}
              shortcut={{ modifiers: ["cmd"], key: "o" }}
            />
            {isFolderEntry(props.entry) && terminalApp && (
              <Action
                title={`Open with ${terminalApp.name}`}
                icon={{ fileIcon: terminalApp.path }}
                shortcut={{ modifiers: ["cmd", "shift"], key: "o" }}
                onAction={() =>
                  open(path, terminalApp).catch(() =>
                    showToast(
                      Toast.Style.Failure,
                      `Failed to open with ${terminalApp?.name}`
                    )
                  )
                }
              />
            )}
          </ActionPanel.Section>
          <ActionPanel.Section>
            <Action.CopyToClipboard
              title="Copy Name"
              content={name}
              shortcut={{ modifiers: ["cmd"], key: "." }}
            />
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
  props: {
    entry: EntryLike;
    uri: string;
    subtitle?: string;
    pinned?: boolean;
  } & PinMethods &
    RemoveMethods
) {
  const remotePath = decodeURI(basename(props.uri));

  const uri = props.uri.replace("vscode-remote://", "windsurf-remote://");

  const getTitle = (openInNewWindow = true) => {
    return openInNewWindow
      ? "Open in New Windsurf Window"
      : "Open in Current Windsurf Window";
  };

  const getUrl = (uri: string, openInNewWindow = true) => {
    const url = new URL(uri);
    if (openInNewWindow) {
      url.searchParams.set("windowId", "_blank");
    } else {
      url.searchParams.delete("windowId");
    }
    return url.toString();
  };

  return (
    <ListOrGridItem
      id={props.pinned ? remotePath : undefined}
      title={remotePath}
      subtitle={props.subtitle || "/"}
      icon="remote.svg"
      content={{ fileIcon: "remote.svg" }}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <Action
              title={getTitle()}
              icon="action-icon.png"
              onAction={async () => {
                await open(getUrl(uri));
                await closeMainWindow();
              }}
            />
            <Action
              title={getTitle(false)}
              icon="action-icon.png"
              shortcut={{ modifiers: ["cmd", "shift"], key: "enter" }}
              onAction={async () => {
                await open(getUrl(uri, false));
                await closeMainWindow();
              }}
            />
          </ActionPanel.Section>
          <RemoveActionSection {...props} />
          <PinActionSection {...props} />
        </ActionPanel>
      }
    />
  );
}

function PinActionSection(
  props: { entry: EntryLike; pinned?: boolean } & PinMethods
) {
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
