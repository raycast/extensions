import { List, ActionPanel, Action } from "@raycast/api";
import { useEffect, useState } from "react";
import { readdir, stat } from "fs/promises";
import { join, resolve, basename } from "path";
import { PathLike } from "fs";

interface Download {
  name: string;
  path: string;
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
        const lastModifiedAt = fileStats.mtime;
        return { name: basename(filePath), path: filePath, lastModifiedAt };
      });
    Promise.all(downloads)
      .then((downloads) => {
        downloads.sort((a, b) => b.lastModifiedAt.getTime() - a.lastModifiedAt.getTime());
        setDownloads(downloads);
      })
      .catch((error) => {
        console.error("Error al obtener las descargas recientes:", error);
      });
  }

  function handleTrash(paths: PathLike | PathLike[]) {
    setDownloads((downloads) =>
      downloads.filter((download) => (Array.isArray(paths) ? !paths.includes(download.path) : paths !== download.path))
    );
  }

  return (
    <List searchBarPlaceholder="Filtrar descargas recientes...">
      {downloads.map((download) => (
        <List.Item
          key={download.path}
          title={download.name}
          icon={{ fileIcon: download.path }}
          quickLook={{ path: download.path, name: download.name }}
          subtitle={download.path}
          actions={
            <ActionPanel>
              <Action.Open title="Open File" target={download.path} />

              <Action.CopyToClipboard
                title="Copy File"
                content={{ file: download.path }}
                shortcut={{ modifiers: ["cmd"], key: "enter" }}
              />

              <Action.ShowInFinder shortcut={{ modifiers: ["cmd"], key: "o" }} path={download.path} />

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
