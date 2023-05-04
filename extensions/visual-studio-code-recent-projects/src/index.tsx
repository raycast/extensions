import { ActionPanel, Action, Grid, Icon, showToast, open } from "@raycast/api";
import { useState } from "react";
import { basename, dirname } from "path";
import tildify from "tildify";
import { fileURLToPath } from "url";
import { useRecentEntries } from "./db";
import { bundleIdentifier, build, keepSectionOrder, closeOtherWindows } from "./preferences";
import { EntryLike, EntryType, RemoteEntry, PinMethods } from "./types";
import {
  filterEntriesByType,
  filterUnpinnedEntries,
  isFileEntry,
  isFolderEntry,
  isRemoteEntry,
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
import { runAppleScriptSync } from "run-applescript";

export default function Command() {
  const { data, isLoading } = useRecentEntries();
  const [type, setType] = useState<EntryType | null>(null);
  const { pinnedEntries, ...pinnedMethods } = usePinnedEntries();

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
          <EntryItem key={`pinned-${index}`} entry={entry} pinned={true} {...pinnedMethods} />
        ))}
      </ListOrGridSection>
      <ListOrGridSection title="Recent Projects">
        {data
          ?.filter(filterUnpinnedEntries(pinnedEntries))
          ?.filter(filterEntriesByType(type))
          .map((entry: EntryLike, index: number) => (
            <EntryItem key={index} entry={entry} {...pinnedMethods} />
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

function EntryItem(props: { entry: EntryLike; pinned?: boolean } & PinMethods) {
  if (isWorkspaceEntry(props.entry)) {
    return <LocalItem {...props} uri={props.entry.workspace.configPath} />;
  } else if (isFolderEntry(props.entry)) {
    return <LocalItem {...props} uri={props.entry.folderUri} />;
  } else if (isRemoteEntry(props.entry)) {
    return <RemoteItem {...props} entry={props.entry} pinned={props.pinned} />;
  } else if (isFileEntry(props.entry)) {
    return <LocalItem {...props} uri={props.entry.fileUri} />;
  } else {
    return null;
  }
}

function LocalItem(props: { entry: EntryLike; uri: string; pinned?: boolean } & PinMethods) {
  const name = decodeURIComponent(basename(props.uri));
  const path = fileURLToPath(props.uri);
  const prettyPath = tildify(path);
  const subtitle = dirname(prettyPath);
  const keywords = path.split("/");

  return (
    <ListOrGridItem
      id={props.pinned ? path : undefined}
      title={name}
      subtitle={subtitle}
      icon={{ fileIcon: path }}
      content={{ fileIcon: path }}
      keywords={keywords}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <Action
              title={`Open in ${build}`}
              icon="action-icon.png"
              onAction={() => {
                if (closeOtherWindows) {
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
              }}
            />
            <Action.ShowInFinder path={path} />
            <Action.OpenWith path={path} shortcut={{ modifiers: ["cmd"], key: "o" }} />
          </ActionPanel.Section>
          <ActionPanel.Section>
            <Action.CopyToClipboard title="Copy Name" content={name} shortcut={{ modifiers: ["cmd"], key: "." }} />
            <Action.CopyToClipboard
              title="Copy Path"
              content={prettyPath}
              shortcut={{ modifiers: ["cmd", "shift"], key: "." }}
            />
          </ActionPanel.Section>
          <PinActionSection {...props} />
        </ActionPanel>
      }
    />
  );
}

function RemoteItem(props: { entry: RemoteEntry; pinned?: boolean } & PinMethods) {
  const remotePath = decodeURI(basename(props.entry.folderUri));
  const uri = props.entry.folderUri.replace("vscode-remote://", "vscode://vscode-remote/");

  return (
    <ListOrGridItem
      id={props.pinned ? remotePath : undefined}
      title={remotePath}
      subtitle={props.entry.label || "/"}
      icon="remote.svg"
      content="remote.svg"
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <Action.OpenInBrowser title={`Open in ${build}`} icon="action-icon.png" url={uri} />
          </ActionPanel.Section>
          <PinActionSection {...props} />
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
          title="Move Up in Pinned Entries"
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
