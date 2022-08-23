import { ActionPanel, Action, List } from "@raycast/api";
import { getDownloads } from "./utils";

export default function Command() {
  const downloads = getDownloads();

  return (
    <List>
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
                <Action.Trash paths={download.path} shortcut={{ modifiers: ["ctrl"], key: "x" }} />
                <Action.Trash
                  title="Delete All Downloads"
                  paths={downloads.map((d) => d.path)}
                  shortcut={{ modifiers: ["ctrl", "shift"], key: "x" }}
                />
              </ActionPanel.Section>
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
