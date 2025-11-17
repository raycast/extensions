import { ActionPanel, Action, List, Icon } from "@raycast/api";
import { PathLike } from "fs";
import { useState } from "react";
import { downloadsFolder, getDownloads, withAccessToDownloadsFolder } from "./utils";

function Command() {
  const [downloads, setDownloads] = useState(getDownloads());

  function handleTrash(paths: PathLike | PathLike[]) {
    setDownloads((downloads) =>
      downloads.filter((download) => (Array.isArray(paths) ? !paths.includes(download.path) : paths !== download.path))
    );
  }

  function handleReload() {
    setDownloads(getDownloads());
  }

  return (
    <List>
      {downloads.length === 0 && (
        <List.EmptyView
          icon={{ fileIcon: downloadsFolder }}
          title="No downloads found"
          description="Well, first download some files ¯\_(ツ)_/¯"
        />
      )}

      {downloads.map((download) => (
        <List.Item
          key={download.path}
          title={download.file}
          icon={{ fileIcon: download.path }}
          quickLook={{ path: download.path, name: download.file }}
          accessories={[
            {
              date: download.lastModifiedAt,
              tooltip: `Last modified: ${download.lastModifiedAt.toLocaleString()}`,
            },
          ]}
          actions={
            <ActionPanel>
              <ActionPanel.Section>
                <Action.Open title="Open File" target={download.path} />
                <Action.ShowInFinder path={download.path} />
                <Action.CopyToClipboard
                  title="Copy File"
                  content={{ file: download.path }}
                  shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
                />
                <Action
                  title="Reload Downloads"
                  icon={Icon.RotateAntiClockwise}
                  shortcut={{ modifiers: ["cmd"], key: "r" }}
                  onAction={handleReload}
                />
              </ActionPanel.Section>
              <ActionPanel.Section>
                <Action.OpenWith path={download.path} shortcut={{ modifiers: ["cmd"], key: "o" }} />
                <Action.ToggleQuickLook shortcut={{ modifiers: ["cmd"], key: "y" }} />
              </ActionPanel.Section>
              <ActionPanel.Section>
                <Action.Trash
                  title="Delete Download"
                  paths={download.path}
                  shortcut={{ modifiers: ["ctrl"], key: "x" }}
                  onTrash={handleTrash}
                />
                <Action.Trash
                  title="Delete All Downloads"
                  paths={downloads.map((d) => d.path)}
                  shortcut={{ modifiers: ["ctrl", "shift"], key: "x" }}
                  onTrash={handleTrash}
                />
              </ActionPanel.Section>
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

export default withAccessToDownloadsFolder(Command);
