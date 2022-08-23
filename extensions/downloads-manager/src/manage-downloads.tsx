import { ActionPanel, Action, List } from "@raycast/api";
import { PathLike } from "fs";
import { useState } from "react";
import { downloadsDir, getDownloads } from "./utils";

export default function Command() {
  const [downloads, setDownloads] = useState(getDownloads());

  function handleTrash(paths: PathLike | PathLike[]) {
    setDownloads((downloads) =>
      downloads.filter((download) => (Array.isArray(paths) ? !paths.includes(download.path) : paths !== download.path))
    );
  }

  return (
    <List>
      {downloads.length === 0 && (
        <List.EmptyView
          icon={{ fileIcon: downloadsDir }}
          title="No downloads found"
          description="Well, first download some files ¯\_(ツ)_/¯"
        />
      )}

      {downloads.map((download) => (
        <List.Item
          key={download.path}
          title={download.file}
          icon={{ fileIcon: download.path }}
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
                <Action.OpenWith path={download.path} shortcut={{ modifiers: ["cmd"], key: "o" }} />
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
