import {
  Action,
  ActionPanel,
  Icon,
  List,
  open,
  showToast,
  Toast,
} from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { basename, dirname } from "path";
import { useState, useEffect } from "react";
import { fileURLToPath } from "url";
import { useRecentEntries, getBuildScheme } from "./lib/db";
import { build } from "./lib/preferences";
import { EntryType, EntryLike } from "./lib/types";
import {
  isFileEntry,
  isFolderEntry,
  isRemoteEntry,
  isRemoteWorkspaceEntry,
  isWorkspaceEntry,
  filterEntriesByType,
} from "./lib/utils";
import { getEditorApplication } from "./lib/editor";

const PAGE_SIZE = 50;

export default function Command() {
  const { data: entriesData, isLoading } = usePromise(useRecentEntries, [], {
    onError: () => {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to load recent projects",
        message: `Could not read the ${build} state database. Make sure ${build} is installed.`,
      });
    },
  });
  const [type, setType] = useState<EntryType | null>(null);
  const [page, setPage] = useState(0);

  const [editorApp, setEditorApp] = useState<Awaited<
    ReturnType<typeof getEditorApplication>
  > | null>(null);

  useEffect(() => {
    getEditorApplication(build).then(setEditorApp);
  }, []);

  const handleTypeChange = (newType: EntryType | null) => {
    setType(newType);
    setPage(0);
  };

  const filtered = (entriesData?.data ?? []).filter(filterEntriesByType(type));
  const paginated = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const hasMore = filtered.length > (page + 1) * PAGE_SIZE;

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search recent projects..."
      searchBarAccessory={<EntryTypeDropdown onChange={handleTypeChange} />}
    >
      {paginated.length === 0 && !isLoading ? (
        <List.EmptyView
          title="No recent projects found"
          description="Open some projects in VS Code first"
          icon={Icon.Folder}
        />
      ) : (
        <>
          {paginated.map((entry: EntryLike, index: number) => (
            <EntryItem
              key={`${page}-${index}`}
              entry={entry}
              editorApp={editorApp}
            />
          ))}
          {hasMore && (
            <List.Item
              title="Load more..."
              actions={
                <ActionPanel>
                  <Action
                    title="Load More"
                    onAction={() => setPage(page + 1)}
                  />
                </ActionPanel>
              }
            />
          )}
        </>
      )}
    </List>
  );
}

function EntryTypeDropdown(props: {
  onChange: (type: EntryType | null) => void;
}) {
  return (
    <List.Dropdown
      tooltip="Filter project types"
      defaultValue="All Types"
      onChange={(value) =>
        props.onChange(value === "All Types" ? null : (value as EntryType))
      }
    >
      <List.Dropdown.Item title="All Types" value="All Types" />
      <List.Dropdown.Section>
        {Object.values(EntryType)
          .filter((key) => key !== "All Types")
          .sort()
          .map((key) => (
            <List.Dropdown.Item key={key} title={key} value={key} />
          ))}
      </List.Dropdown.Section>
    </List.Dropdown>
  );
}

function EntryItem(props: {
  entry: EntryLike;
  editorApp: Awaited<ReturnType<typeof getEditorApplication>> | null;
}) {
  if (isWorkspaceEntry(props.entry)) {
    return (
      <LocalItem
        uri={props.entry.workspace.configPath}
        entry={props.entry}
        editorApp={props.editorApp}
      />
    );
  } else if (isFolderEntry(props.entry)) {
    return (
      <LocalItem
        uri={props.entry.folderUri}
        entry={props.entry}
        editorApp={props.editorApp}
      />
    );
  } else if (isRemoteEntry(props.entry)) {
    return (
      <RemoteItem
        uri={props.entry.folderUri}
        label={props.entry.label}
        entry={props.entry}
      />
    );
  } else if (isRemoteWorkspaceEntry(props.entry)) {
    return (
      <RemoteItem
        uri={props.entry.workspace.configPath}
        label={props.entry.label || "/"}
        entry={props.entry}
      />
    );
  } else if (isFileEntry(props.entry)) {
    return (
      <LocalItem
        uri={props.entry.fileUri}
        entry={props.entry}
        editorApp={props.editorApp}
      />
    );
  } else {
    return null;
  }
}

function LocalItem(props: {
  uri: string;
  entry: EntryLike;
  editorApp: Awaited<ReturnType<typeof getEditorApplication>> | null;
}) {
  const name = decodeURIComponent(basename(props.uri));
  const path = fileURLToPath(props.uri);
  const subtitle = dirname(path);

  const handleOpen = async () => {
    if (props.editorApp) {
      await open(path, props.editorApp);
    } else {
      await open(path);
    }
  };

  return (
    <List.Item
      title={name}
      subtitle={subtitle}
      icon={{ fileIcon: path }}
      accessories={
        isFolderEntry(props.entry)
          ? [{ icon: Icon.Folder }]
          : isWorkspaceEntry(props.entry)
            ? [{ icon: Icon.Document }]
            : [{ icon: Icon.Document }]
      }
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <Action
              title={`Open in ${build}`}
              icon={
                props.editorApp
                  ? { fileIcon: props.editorApp.path }
                  : Icon.Globe
              }
              onAction={handleOpen}
            />
            <Action.ShowInFinder path={path} />
            <Action.OpenWith
              path={path}
              shortcut={{ modifiers: ["cmd"], key: "o" }}
            />
          </ActionPanel.Section>
          <ActionPanel.Section>
            <Action.CopyToClipboard
              title="Copy Name"
              content={name}
              shortcut={{ modifiers: ["cmd"], key: "." }}
            />
            <Action.CopyToClipboard
              title="Copy Path"
              content={path}
              shortcut={{ modifiers: ["cmd", "shift"], key: "." }}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}

function RemoteItem(props: { uri: string; label: string; entry: EntryLike }) {
  const name = decodeURI(basename(props.uri));
  const scheme = getBuildScheme();
  const uri = props.uri.replace(
    "vscode-remote://",
    `${scheme}://vscode-remote/`,
  );

  return (
    <List.Item
      title={name}
      subtitle={props.label || "/"}
      icon={Icon.Globe}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <Action.OpenInBrowser title={`Open in ${build}`} url={uri} />
          </ActionPanel.Section>
          <ActionPanel.Section>
            <Action.CopyToClipboard title="Copy Name" content={name} />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}
