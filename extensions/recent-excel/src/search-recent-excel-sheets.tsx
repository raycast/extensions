import os from "os";
import path from "path";
import { List, open, ActionPanel, Action, getPreferenceValues } from "@raycast/api";
import { useEffect, useState } from "react";
import { exec } from "child_process";
import { promisify } from "util";

interface ExcelFile {
  path: string;
  lastModified: Date;
}

const resolveDirectory = (dir: string): string => {
  if (dir.startsWith("~")) {
    return path.join(os.homedir(), dir.slice(1));
  }
  return dir;
};

const getExcelFilesInDirectoryUsingFind = async (directory: string): Promise<ExcelFile[]> => {
  const execAsync = promisify(exec);

  try {
    const { stdout, stderr } = await execAsync(
      `find "${directory}" -type f \\( -name "*.xls" -o -name "*.xlsx" -o -name "*.xlsm" \\) | head -n 200 | xargs -I{} stat -f "%N,%m" "{}"`,
      { maxBuffer: 1024 * 1024 * 10 },
    );

    if (stderr) {
      console.error(`Error executing find command: ${stderr}`);
      return [];
    }

    const excelFiles: ExcelFile[] = stdout
      .trim()
      .split("\n")
      .filter((line) => line.includes(",")) // Filter out lines without a comma separator
      .map((line) => {
        const [path, lastModified] = line.split(",");
        const lastModifiedDate = new Date(Number(lastModified) * 1000);
        return {
          path,
          lastModified: isNaN(lastModifiedDate.getTime()) ? new Date(0) : lastModifiedDate, // Handle invalid dates
        };
      });

    return excelFiles;
  } catch (error) {
    console.error(`Error executing find command: ${error}`);
    return [];
  }
};
const removeChildrenFolders = (folders: string[]): string[] => {
  // Case 1: users/user/folder/ & ~/folder
  // Case 2: ~/folder & ~/folder/something

  folders = folders.map((folder) => resolveDirectory(folder));
  folders.sort((a, b) => b.length - a.length);
  // here we check for case 2 - we need to check for each one if it's a prefix of another one
  const filteredFolders: string[] = [];

  for (const folderName of folders) {
    let isChildFolder = false;
    for (const filteredFolder of filteredFolders) {
      if (filteredFolder.includes(folderName)) {
        isChildFolder = true;
        break;
      }
    }
    if (!isChildFolder) {
      filteredFolders.push(folderName);
    }
  }
  return filteredFolders;
};

export default function Command(props: { arguments: { folderPath?: string } }) {
  const [list, setList] = useState<ExcelFile[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const { directories } = getPreferenceValues<Preferences>();

  useEffect(() => {
    const fetchExcelFiles = async () => {
      setIsLoading(true);
      let folders = props.arguments.folderPath
        ? props.arguments.folderPath.split(",").map((dir) => dir.trim())
        : directories?.split(",").map((dir) => dir.trim()) || [];
      folders = removeChildrenFolders(folders);

      const excelFilesInUsers = (await Promise.all(folders.map(getExcelFilesInDirectoryUsingFind))).flat();
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
