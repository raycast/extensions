import { ActionPanel, List, Action, Grid } from "@raycast/api";
import { useState, useEffect } from "react";
import { basename, dirname } from "path";
import tildify from "tildify";
import { fileURLToPath } from "url";
import { useRecentEntries } from "./db";
import { isDeepStrictEqual } from "util";
import { preferences, layout, getBundleIdentifier } from "./preferences";
import {
  Filters,
  EntryLike,
  EntryType,
  isFileEntry,
  isFolderEntry,
  isRemoteEntry,
  isWorkspaceEntry,
  RemoteEntry,
} from "./types";
import {
  ListOrGrid,
  ListOrGridDropdown,
  ListOrGridDropdownSection,
  ListOrGridDropdownItem,
  ListOrGridSection,
} from "./grid-or-list";
import { getPinnedEntries, getPinnedMovement, PinnedActions, removePinnedEntry } from "./pinned";

export default function Command() {
  const { data, isLoading } = useRecentEntries();
  const [type, setType] = useState<EntryType>("All Types");

  const [refresh, setRefresh] = useState<boolean>(false);
  const [pinnedEntries, setPinnedEntries] = useState<EntryLike[]>([]);
  useEffect(() => {
    setPinnedEntries(getPinnedEntries());
  }, [refresh]);
  const refreshPinned = () => setRefresh(!refresh);

  function RemoteItem(props: { entry: RemoteEntry; pinned?: boolean }) {
    const remotePath = decodeURI(basename(props.entry.folderUri));
    const uri = props.entry.folderUri.replace("vscode-remote://", "vscode://vscode-remote/");

    const Actions = (): JSX.Element => (
      <ActionPanel>
        <ActionPanel.Section>
          <Action.OpenInBrowser title={`Open in ${preferences.build}`} icon="action-icon.png" url={uri} />
        </ActionPanel.Section>
        <PinnedActions
          {...props}
          refresh={refreshPinned}
          movement={getPinnedMovement(pinnedEntries, props.entry)}
          type={Filters[type]}
        />
      </ActionPanel>
    );

    return layout === "list" ? (
      <List.Item
        id={props.pinned ? remotePath : undefined}
        title={remotePath}
        subtitle={props.entry.label || "/"}
        icon={"../assets/remote.svg"}
        actions={<Actions></Actions>}
      />
    ) : (
      <Grid.Item
        id={props.pinned ? remotePath : undefined}
        title={remotePath}
        subtitle={props.entry.label || "/"}
        content={"../assets/remote.svg"}
        actions={<Actions></Actions>}
      />
    );
  }

  function LocalItem(props: { entry: EntryLike; uri: string; pinned?: boolean }) {
    const name = decodeURIComponent(basename(props.uri));
    const path = fileURLToPath(props.uri);
    const prettyPath = tildify(path);
    const subtitle = dirname(prettyPath);
    const keywords = path.split("/");
    const appKey = getBundleIdentifier();

    const Actions = (): JSX.Element => (
      <ActionPanel>
        <ActionPanel.Section>
          <Action.Open
            title={`Open in ${preferences.build}`}
            icon="action-icon.png"
            target={props.uri}
            application={appKey}
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
        <ActionPanel.Section>
          <Action.Trash
            paths={[path]}
            shortcut={{ modifiers: ["ctrl"], key: "x" }}
            onTrash={() => {
              removePinnedEntry(props.entry);
              refreshPinned();
            }}
          />
        </ActionPanel.Section>
        <PinnedActions
          {...props}
          refresh={refreshPinned}
          movement={getPinnedMovement(pinnedEntries, props.entry)}
          type={Filters[type]}
        />
      </ActionPanel>
    );

    return layout === "list" ? (
      <List.Item
        id={props.pinned ? path : undefined}
        title={name}
        subtitle={subtitle}
        icon={{ fileIcon: path }}
        keywords={keywords}
        actions={<Actions></Actions>}
      />
    ) : (
      <Grid.Item
        id={props.pinned ? path : undefined}
        title={name}
        subtitle={subtitle}
        content={{ fileIcon: path }}
        keywords={keywords}
        actions={<Actions></Actions>}
      />
    );
  }

  const Entry = (props: { entry: EntryLike; pinned?: boolean }): JSX.Element => {
    if (isWorkspaceEntry(props.entry)) {
      return <LocalItem {...props} uri={props.entry.workspace.configPath} />;
    } else if (isFolderEntry(props.entry)) {
      return <LocalItem {...props} uri={props.entry.folderUri} />;
    } else if (isRemoteEntry(props.entry)) {
      return <RemoteItem entry={props.entry} pinned={props.pinned} />;
    } else if (isFileEntry(props.entry)) {
      return <LocalItem {...props} uri={props.entry.fileUri} />;
    }
    return <></>;
  };

  return (
    <ListOrGrid
      itemSize={Grid.ItemSize.Small}
      inset={Grid.Inset.Medium}
      searchBarPlaceholder="Search recent projects..."
      isLoading={isLoading}
      filtering={{ keepSectionOrder: preferences.keepSectionOrder }}
      searchBarAccessory={
        <ListOrGridDropdown tooltip="Type of Project" onChange={(value: string) => setType(value as EntryType)}>
          <ListOrGridDropdownItem title={"All Types"} value={"All Types"} />
          <ListOrGridDropdownSection>
            {Object.keys(Filters)
              .filter((key) => key !== "All Types")
              .map((key) => (
                <ListOrGridDropdownItem key={key} title={key} value={key} />
              ))}
          </ListOrGridDropdownSection>
        </ListOrGridDropdown>
      }
    >
      <ListOrGridSection title="Pinned Projects">
        {pinnedEntries.filter(Filters[type]).map((entry: EntryLike, index: number) => (
          <Entry key={`pinned-${index}`} entry={entry} pinned={true} />
        ))}
      </ListOrGridSection>
      <ListOrGridSection title="Recent Projects">
        {data
          ?.filter((a) => Filters[type](a) && pinnedEntries.find((b) => isDeepStrictEqual(a, b)) === undefined)
          .map((entry: EntryLike, index: number) => (
            <Entry key={index} entry={entry} />
          ))}
      </ListOrGridSection>
    </ListOrGrid>
  );
}
