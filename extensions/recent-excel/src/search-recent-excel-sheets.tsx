import { List, open, ActionPanel, Action } from "@raycast/api";
import { useEffect, useState } from "react";
import fs from "fs";
import path from "path";
import getPreferences from "./preferences";

interface ExcelFile {
  path: string;
  lastModified: Date;
}

const getExcelFilesInUsers = (directory: string): ExcelFile[] => {
  const excelFiles: ExcelFile[] = [];

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
        } catch (error: any) {
          if (error.code === "ENOENT") {
            // File or directory does not exist, skip it silently
          } else {
            console.error(`Error accessing file: ${filePath}`, error);
          }
          // Continue to the next file
        }
      }
    } catch (error: any) {
      if (error.code === "ENOENT") {
        // Directory does not exist, skip it silently
      } else {
        console.error(`Error accessing directory: ${currentDir}`, error);
      }
      // Continue to the next directory
    }
  };

  traverseDirectory(directory);
  return excelFiles;
};

export default function Command() {
  const [list, setList] = useState<ExcelFile[]>([]);
  const { directories } = getPreferences();

  useEffect(() => {
    const folders = directories
      ? directories.split(",").map((dir) => dir.trim())
      : [];

    const excelFilesInUsers = folders.flatMap((folder) =>
      getExcelFilesInUsers(folder)
    );

    const sortedExcelFiles = excelFilesInUsers.sort(
      (a, b) => b.lastModified.getTime() - a.lastModified.getTime()
    );
    setList(sortedExcelFiles);
  }, [directories]);

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
              <Action
                title="Open Excel File"
                onAction={() => handleOpenFile(excelFile.path)}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
