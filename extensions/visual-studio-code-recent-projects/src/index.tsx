import { ActionPanel, Icon, List, showToast, Action, Toast } from "@raycast/api";
import { basename, dirname } from "path";
import { useEffect, useState } from "react";
import tildify from "tildify";
import { fileURLToPath } from "url";
import { build, getRecentEntries } from "./db";
import { EntryLike, isFileEntry, isFolderEntry, isRemoteEntry, isWorkspaceEntry, RemoteEntry } from "./types";

const appKeyMapping = {
  Code: "com.microsoft.VSCode",
  "Code - Insiders": "com.microsoft.VSCodeInsiders",
} as const;

const appKey: string = appKeyMapping[build] ?? appKeyMapping.Code;

export default function Command() {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string>();
  const [entries, setEntries] = useState<EntryLike[]>([]);

  useEffect(() => {
    getRecentEntries()
      .then((entries) => setEntries(entries))
      .catch((e) => setError(e.message))
      .finally(() => setIsLoading(false));
  }, []);

  if (error) {
    showToast({
      style: Toast.Style.Failure,
      title: "Failed to load recent projects",
      message: error,
    });
  }

  return (
    <List searchBarPlaceholder="Search recent projects..." isLoading={isLoading}>
      <List.Section title="Workspaces">
        {entries.filter(isWorkspaceEntry).map((entry) => (
          <LocalListItem key={entry.workspace.configPath} uri={entry.workspace.configPath} />
        ))}
      </List.Section>

      <List.Section title="Folders">
        {entries.filter(isFolderEntry).map((entry) => (
          <LocalListItem key={entry.folderUri} uri={entry.folderUri} />
        ))}
      </List.Section>

      <List.Section title="Remotes Folders">
        {entries.filter(isRemoteEntry).map((entry) => (
          <RemoteListItem key={entry.folderUri} entry={entry} />
        ))}
      </List.Section>

      <List.Section title="Files">
        {entries.filter(isFileEntry).map((entry) => (
          <LocalListItem key={entry.fileUri} uri={entry.fileUri} />
        ))}
      </List.Section>
    </List>
  );
}

function RemoteListItem(props: { entry: RemoteEntry }) {
  const remotePath = decodeURI(basename(props.entry.folderUri));
  const uri = props.entry.folderUri.replace("vscode-remote://", "vscode://vscode-remote/");

  return (
    <List.Item
      title={remotePath}
      subtitle={props.entry.label || "/"}
      icon={Icon.Globe}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <Action.OpenInBrowser title={`Open in ${build}`} icon="action-icon.png" url={uri} />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}

function LocalListItem(props: { uri: string }) {
  const name = decodeURIComponent(basename(props.uri));
  const path = fileURLToPath(props.uri);
  const prettyPath = tildify(path);
  const subtitle = dirname(prettyPath);
  const keywords = path.split("/");
  return (
    <List.Item
      title={name}
      subtitle={subtitle}
      icon={{ fileIcon: path }}
      keywords={keywords}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <Action.Open title={`Open in ${build}`} icon="action-icon.png" target={props.uri} application={appKey} />
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
            <Action.Trash paths={[path]} shortcut={{ modifiers: ["ctrl"], key: "x" }} />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}
