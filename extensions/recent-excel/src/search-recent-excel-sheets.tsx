import { List, open, ActionPanel, Action } from "@raycast/api";
import { useEffect, useState } from "react";
import fs from "fs";
import path from "path";
import { getPreferenceValues } from "@raycast/api";
import os from "os";

interface ExcelFile {
  path: string;
  lastModified: Date;
}

const getExcelFilesInUsers = (directory: string): ExcelFile[] => {
  const excelFiles: ExcelFile[] = [];

  const resolveDirectory = (dir: string) => {
    if (dir.startsWith("~")) {
      return path.join(os.homedir(), dir.slice(1));
    }
    return dir;
  };

  const traverseDirectory = (currentDir: string) => {
    try {
      const files = fs.readdirSync(currentDir);

      for (const file of files) {
        const filePath = path.join(currentDir, file);

        try {
          const stats = fs.statSync(filePath);

          if (stats.isDirectory()) {
            traverseDirectory(filePath);
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
          // Continue to the next file
        }
      }
    } catch (error) {
      if (error instanceof Error && error.message.includes("ENOENT")) {
        // Directory does not exist, skip it silently
      } else {
        console.error(`Error accessing directory: ${currentDir}`, error);
      }
      // Continue to the next directory
    }
  };

  const resolvedDirectory = resolveDirectory(directory);
  traverseDirectory(resolvedDirectory);
  return excelFiles;
};

export default function Command(props: { arguments: { folderPath?: string } }) {
  const [list, setList] = useState<ExcelFile[]>([]);
  const { directories } = getPreferenceValues<Preferences>();

  useEffect(() => {
    let folders: string[] = [];

    if (props.arguments.folderPath) {
      folders = [props.arguments.folderPath];
    } else {
      folders = directories ? directories.split(",").map((dir) => dir.trim()) : [];
    }

    const excelFilesInUsers = folders.flatMap((folder) => getExcelFilesInUsers(folder));

    const sortedExcelFiles = excelFilesInUsers.sort((a, b) => b.lastModified.getTime() - a.lastModified.getTime());
    setList(sortedExcelFiles);
  }, [directories, props.arguments.folderPath]);

  const handleOpenFile = (filePath: string) => {
    open(filePath);
  };

  return (
    <List>
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
