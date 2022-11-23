import { ActionPanel, Icon, List, Action } from "@raycast/api";
import { basename, dirname } from "path";
import tildify from "tildify";
import { fileURLToPath } from "url";
import { useRecentEntries } from "./db";
import { preferences } from "./preferences";
import { isFileEntry, isFolderEntry, isRemoteEntry, isWorkspaceEntry, RemoteEntry, VSCodeBuild } from "./types";

export default function Command() {
  const { data, isLoading } = useRecentEntries();

  return (
    <List
      searchBarPlaceholder="Search recent projects..."
      isLoading={isLoading}
      filtering={{ keepSectionOrder: preferences.keepSectionOrder }}
    >
      <List.Section title="Workspaces">
        {data?.filter(isWorkspaceEntry).map((entry) => (
          <LocalListItem key={entry.workspace.configPath} uri={entry.workspace.configPath} />
        ))}
      </List.Section>
      <List.Section title="Folders">
        {data?.filter(isFolderEntry).map((entry) => (
          <LocalListItem key={entry.folderUri} uri={entry.folderUri} />
        ))}
      </List.Section>
      <List.Section title="Remotes Folders">
        {data?.filter(isRemoteEntry).map((entry) => (
          <RemoteListItem key={entry.folderUri} entry={entry} />
        ))}
      </List.Section>
      <List.Section title="Files">
        {data?.filter(isFileEntry).map((entry) => (
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
            <Action.OpenInBrowser title={`Open in ${preferences.build}`} icon="action-icon.png" url={uri} />
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
  const appKey = preferences.build === VSCodeBuild.Code ? "com.microsoft.VSCode" : "com.microsoft.VSCodeInsiders";

  return (
    <List.Item
      title={name}
      subtitle={subtitle}
      icon={{ fileIcon: path }}
      keywords={keywords}
      actions={
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
            <Action.Trash paths={[path]} shortcut={{ modifiers: ["ctrl"], key: "x" }} />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}
