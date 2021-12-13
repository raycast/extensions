import {
  ActionPanel,
  CopyToClipboardAction,
  environment,
  List,
  OpenAction,
  OpenWithAction,
  ShowInFinderAction,
  TrashAction,
} from "@raycast/api";
import { existsSync, readFileSync } from "fs";
import tildify from "tildify";
import { homedir } from "os";
import { basename, dirname } from "path";
import { fileURLToPath, URL } from "url";
import { ReactNode } from "react";
import { EntryLike, isFileEntry, isFolderEntry, isRemoteEntry, isWorkspaceEntry } from "./types";

const STORAGE = `${homedir()}/Library/Application Support/Code/storage.json`;

function getRecentEntries(): EntryLike[] {
  const json = JSON.parse(readFileSync(STORAGE).toString());
  return json.openedPathsList.entries;
}

export default function Command() {
  const folders = new Array<ReactNode>();
  const files = new Array<ReactNode>();
  const workspaces = new Array<ReactNode>();
  const remoteEntries = new Array<ReactNode>();

  const recentEntries = getRecentEntries();
  recentEntries.forEach((entry) => {
    if (isRemoteEntry(entry)) {
      remoteEntries.push(<ProjectListItem key={entry.folderUri} uri={entry.folderUri} />);
    } else if (isFolderEntry(entry) && existsSync(new URL(entry.folderUri))) {
      folders.push(<ProjectListItem key={entry.folderUri} uri={entry.folderUri} />);
    } else if (isFileEntry(entry) && existsSync(new URL(entry.fileUri))) {
      files.push(<ProjectListItem key={entry.fileUri} uri={entry.fileUri} />);
    } else if (isWorkspaceEntry(entry) && existsSync(new URL(entry.workspace.configPath))) {
      workspaces.push(<ProjectListItem key={entry.workspace.configPath} uri={entry.workspace.configPath} />);
    }
  });

  return (
    <List searchBarPlaceholder="Search recent projects...">
      <List.Section title="Workspaces">{workspaces}</List.Section>
      <List.Section title="Folders">{folders}</List.Section>
      <List.Section title="Remote">{remoteEntries}</List.Section>
      <List.Section title="Files">{files}</List.Section>
    </List>
  );
}

function ProjectListItem(props: { uri: string }) {
  const name = decodeURI(basename(props.uri));
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
            <OpenAction
              title="Open in Code"
              icon="action-icon.png"
              target={props.uri}
              application="Visual Studio Code"
            />
            <ShowInFinderAction path={path} />
            <OpenWithAction path={path} shortcut={{ modifiers: ["cmd"], key: "o" }} />
          </ActionPanel.Section>
          <ActionPanel.Section>
            <CopyToClipboardAction title="Copy Name" content={name} shortcut={{ modifiers: ["cmd"], key: "." }} />
            <CopyToClipboardAction
              title="Copy Path"
              content={prettyPath}
              shortcut={{ modifiers: ["cmd", "shift"], key: "." }}
            />
          </ActionPanel.Section>
          <ActionPanel.Section>
            <TrashAction paths={[path]} shortcut={{ modifiers: ["ctrl"], key: "x" }} />
          </ActionPanel.Section>
          <DevelopmentActionSection />
        </ActionPanel>
      }
    />
  );
}

function DevelopmentActionSection() {
  return environment.isDevelopment ? (
    <ActionPanel.Section title="Development">
      <OpenAction title="Open Storage File in Code" icon="icon.png" target={STORAGE} application="Visual Studio Code" />
      <ShowInFinderAction title="Show Storage File in Finder" path={STORAGE} />
      <CopyToClipboardAction title="Copy Storage File Path" content={STORAGE} />
    </ActionPanel.Section>
  ) : null;
}
