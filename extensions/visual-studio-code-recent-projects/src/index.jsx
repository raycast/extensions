import { ActionPanel, CopyToClipboardAction, List, OpenAction, ShowInFinderAction } from "@raycast/api";
import { existsSync, readFileSync } from "fs";
import tildify from "tildify";
import { homedir } from "os";
import { basename, dirname } from "path";
import { fileURLToPath } from "url";

const STORAGE = `${homedir()}/Library/Application Support/Code/storage.json`;

function getRecentEntries() {
  const json = JSON.parse(readFileSync(STORAGE).toString());
  return json.openedPathsList.entries;
}

export default function Command() {
  const folders = [];
  const files = [];

  const recentEntries = getRecentEntries();
  recentEntries.forEach((entry) => {
    if (entry.folderUri && existsSync(new URL(entry.folderUri))) {
      folders.push(<ProjectListItem key={entry.folderUri} uri={entry.folderUri} />);
    } else if (entry.fileUri && existsSync(new URL(entry.fileUri))) {
      files.push(<ProjectListItem key={entry.fileUri} uri={entry.fileUri} />);
    }
  });

  return (
    <List searchBarPlaceholder="Search recent projects...">
      <List.Section title="Folders">{folders}</List.Section>
      <List.Section title="Files">{files}</List.Section>
    </List>
  );
}

function ProjectListItem(props) {
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
            <OpenAction title="Open in Code" icon="icon.png" target={props.uri} application="Visual Studio Code" />
            <ShowInFinderAction path={path} />
          </ActionPanel.Section>
          <ActionPanel.Section>
            <CopyToClipboardAction title="Copy Name" content={name} shortcut={{ modifiers: ["cmd"], key: "." }} />
            <CopyToClipboardAction
              title="Copy Path"
              content={prettyPath}
              shortcut={{ modifiers: ["cmd", "shift"], key: "." }}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}
