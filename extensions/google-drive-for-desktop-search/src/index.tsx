import { Action, ActionPanel, getPreferenceValues, List } from "@raycast/api";
import fs from "fs/promises";
import path from "path";
import { useEffect, useState } from "react";

interface Preferences {
  rootPath: string;
  excludePaths?: string;
}

interface FileInfo {
  name: string;
  type: 'file' | 'directory';
  path: string;
}

const getFileInfo = async (rootPath: string, excludePaths: string[]): Promise<FileInfo[]> => {
  const walk = async (dir: string): Promise<FileInfo[]> => {
    const files = await fs.readdir(dir);
    return (
      await Promise.all(
        files
          .filter((file) => !file.startsWith("."))
          .map<Promise<FileInfo[]>>(async (file): Promise<FileInfo[]> => {
            const filePath = path.join(dir, file);

            if (excludePaths.includes(filePath)) {
              return [];
            }

            const stats = await fs.stat(filePath);
            if (stats.isDirectory()) {
              return [{ name: file, type: 'directory', path: filePath }, ...(await walk(filePath))];
            }
            if (stats.isFile()) {
              return [{ name: file, type: 'file', path: filePath }];
            }

            return [];
          })
      )
    ).reduce((prev, files) => [...prev, ...files], []);
  };

  return walk(rootPath);
};


export default function SearchGoogleDriveForDesktopFile() {
  const preferences = getPreferenceValues<Preferences>();

  const rootPath = path.resolve(preferences.rootPath);
  const exludePaths = preferences.excludePaths?.split(",").map(p => p.trim()).map((p) => path.resolve(p)) ?? [];

  const [files, setFiles] = useState<FileInfo[]>([]);

  useEffect(() => {
    (async () => {
      setFiles(await getFileInfo(rootPath, exludePaths));
    })();
  }, [setFiles, rootPath, exludePaths]);

  return (
    <List isLoading={files.length === 0}>
      {files.map((file) => (
        <List.Item
          key={file.path}
          title={file.name}
          subtitle={file.path}
          icon={{ fileIcon: file.path }}
          actions={
            <ActionPanel>
              {file.type === 'file' && <Action.Open title="Open" target={file.path} />}
              <Action.ShowInFinder path={file.path} />
              <Action.CopyToClipboard
                title="Copy Directory Path"
                content={`${file.path}/`}
                shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
