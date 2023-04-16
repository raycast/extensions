import { List, ActionPanel, Action } from "@raycast/api";
import { useEffect, useState } from "react";
import { readdir, stat } from "fs/promises";
import { join, resolve, basename } from "path";
import { PathLike } from "fs";

interface Download {
  name: string;
  path: string;
  size: number;
  lastModifiedAt: Date;
}

export default function RecentDownloads() {
  const [downloads, setDownloads] = useState<Download[]>([]);

  useEffect(() => {
    getRecentDownloads();
  }, []);

  async function getRecentDownloads() {
    const downloadsPath = resolve(process.env.HOME || "", "Downloads");
    const files = await readdir(downloadsPath);
    const downloads = files
      .filter((file) => !file.startsWith("."))
      .map(async (file) => {
        const filePath = join(downloadsPath, file);
        const fileStats = await stat(filePath);
        const size = fileStats.size;
        const lastModifiedAt = fileStats.mtime;
        return { name: basename(filePath), path: filePath, size, lastModifiedAt };
      });
    Promise.all(downloads)
      .then((downloads) => {
        downloads.sort((a, b) => b.lastModifiedAt.getTime() - a.lastModifiedAt.getTime());
        setDownloads(downloads);
      })
      .catch((error) => {
        console.error("Sorry, Error get recent files", error);
      });
  }

  function handleTrash(paths: PathLike | PathLike[]) {
    setDownloads((downloads) =>
      downloads.filter((download) => (Array.isArray(paths) ? !paths.includes(download.path) : paths !== download.path))
    );
  }

  const markdown = `![Image](download.path)`;

  return (
    <List isShowingDetail searchBarPlaceholder="Filter files...">
      {downloads.map((download) => (
        <List.Item
          key={download.path}
          title={download.name}
          icon={{ fileIcon: download.path }}
          quickLook={{ path: download.path, name: download.name }}
          subtitle={download.path}
          detail={
            <List.Item.Detail
              markdown={`![Image](${download.path})`}
              metadata={
                <List.Item.Detail.Metadata>
                  <List.Item.Detail.Metadata.Label title="Size" text={`${(download.size / 1024).toFixed(2)} KB`} />
                  <List.Item.Detail.Metadata.Label
                    title="Last Modified"
                    text={download.lastModifiedAt.toLocaleString()}
                  />

                  <List.Item.Detail.Metadata.Label title="Location" text={download.path} />
                </List.Item.Detail.Metadata>
              }
            />
          }
          actions={
            <ActionPanel>
              <Action.Open title="Open File" target={download.path} />
              <Action.CopyToClipboard
                title="Copy File"
                content={{ file: download.path }}
                shortcut={{ modifiers: ["cmd"], key: "enter" }}
              />
              <Action.ShowInFinder shortcut={{ modifiers: ["cmd"], key: "o" }} path={download.path} />

              <Action.ToggleQuickLook title="Preview File" shortcut={{ modifiers: ["cmd"], key: "y" }} />
              <Action.Trash
                title="Delete File"
                paths={[download.path]}
                shortcut={{ modifiers: ["cmd"], key: "backspace" }}
                onTrash={handleTrash}
              />
              <Action.Trash
                title="Delete All"
                paths={downloads.map((download) => download.path)}
                shortcut={{ modifiers: ["cmd", "shift"], key: "backspace" }}
                onTrash={() => setDownloads([])}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
