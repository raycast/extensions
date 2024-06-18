import { List, open, ActionPanel, Action } from "@raycast/api";
import { useEffect, useState } from "react";
import fs from "fs/promises";
import path from "path";
import { getPreferenceValues } from "@raycast/api";
import os from "os";

interface ExcelFile {
  path: string;
  lastModified: Date;
}

const getExcelFilesInDirectory = async (directory: string): Promise<ExcelFile[]> => {
  const excelFiles: ExcelFile[] = [];

  const resolveDirectory = (dir: string) => {
    if (dir.startsWith("~")) {
      return path.join(os.homedir(), dir.slice(1));
    }
    return dir;
  };

  const traverseDirectory = async (currentDir: string) => {
    try {
      const files = await fs.readdir(currentDir);

      await Promise.all(
        files.map(async (file) => {
          const filePath = path.join(currentDir, file);

          try {
            const stats = await fs.stat(filePath);

            if (stats.isDirectory()) {
              await traverseDirectory(filePath);
            } else if (
              file.toLowerCase().endsWith(".xls") ||
              file.toLowerCase().endsWith(".xlsx") ||
              file.toLowerCase().endsWith(".xlsm")
            ) {
              excelFiles.push({ path: filePath, lastModified: stats.mtime });
            }
          } catch (error) {
            if (error instanceof Error && error.message.includes("ENOENT")) {
              // File or directory does not exist, skip it silently
            } else {
              console.error(`Error accessing file: ${filePath}`, error);
            }
          }
        }),
      );
    } catch (error) {
      if (error instanceof Error && error.message.includes("ENOENT")) {
        // Directory does not exist, skip it silently
      } else {
        console.error(`Error accessing directory: ${currentDir}`, error);
      }
    }
  };

  const resolvedDirectory = resolveDirectory(directory);
  await traverseDirectory(resolvedDirectory);
  return excelFiles;
};

export default function Command(props: { arguments: { folderPath?: string } }) {
  const [list, setList] = useState<ExcelFile[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const { directories } = getPreferenceValues<Preferences>();

  useEffect(() => {
    const fetchExcelFiles = async () => {
      setIsLoading(true);
      const folders = props.arguments.folderPath
        ? [props.arguments.folderPath]
        : directories?.split(",").map((dir) => dir.trim()) || [];

      const excelFilesInUsers = (await Promise.all(folders.map(getExcelFilesInDirectory))).flat();
      const sortedExcelFiles = excelFilesInUsers.sort((a, b) => b.lastModified.getTime() - a.lastModified.getTime());

      setList(sortedExcelFiles);
      setIsLoading(false);
    };

    fetchExcelFiles();
  }, [props.arguments.folderPath, directories]);

  const handleOpenFile = (filePath: string) => {
    open(filePath);
  };

  return (
    <List isLoading={isLoading}>
      {list.map((excelFile) => (
        <List.Item
          key={excelFile.path}
          title={path.basename(excelFile.path)}
          subtitle={excelFile.path}
          accessories={[{ text: excelFile.lastModified.toLocaleString() }]}
          actions={
            <ActionPanel>
              <Action title="Open Excel File" onAction={() => handleOpenFile(excelFile.path)} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
