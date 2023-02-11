import { ActionPanel, List, showToast, Toast, Icon, Action } from "@raycast/api";
import { promisify } from "node:util";
import { exec as _exec } from "node:child_process";
import { filesize } from "filesize";
import { lstatSync, readdirSync, readlinkSync } from "node:fs";
import { resolve } from "node:path";
import { homedir } from "node:os";
import { getExtPreferences } from "./preferences";
import { ActionsGoDirectoryPair } from "./utils/actions";
import { Directory } from "./ui/Directory";
import { FileDataType, FileType } from "./types";

const exec = promisify(_exec);

export async function runShellScript(command: string) {
  const { stdout, stderr } = await exec(command);
  return { stdout, stderr };
}

export function getStartDirectory(): string {
  let { startDirectory } = getExtPreferences();
  startDirectory = startDirectory.replace("~", homedir());
  return resolve(startDirectory);
}

export function DirectoryItem(props: { fileData: FileDataType }) {
  const { fileData } = props;
  const { showFilePermissions } = getExtPreferences();

  const currentFolderPath = fileData.path;
  const filePath = `${currentFolderPath}/${fileData.name}`;

  return (
    <List.Item
      id={filePath}
      title={fileData.name}
      subtitle={showFilePermissions ? fileData.permissions : ""}
      icon={{ fileIcon: filePath }}
      actions={
        <ActionPanel>
          <Action.Push title="Open Directory" icon={Icon.ArrowRight} target={<Directory path={filePath} />} />
          <Action.ShowInFinder path={filePath} />
          <Action.CopyToClipboard
            title="Copy Directory Path"
            content={`${filePath}/`}
            shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
          />
          <ActionsGoDirectoryPair currentFolderPath={currentFolderPath} subDirectoryPath={filePath} />
        </ActionPanel>
      }
    />
  );
}

export function FileItem(props: { fileData: FileDataType }) {
  const { fileData } = props;
  const { showFilePermissions, showFileSize } = getExtPreferences();

  const currentFolderPath = fileData.path;
  const filePath = `${currentFolderPath}/${fileData.name}`;

  return (
    <List.Item
      key={filePath}
      id={filePath}
      title={fileData.name}
      icon={{ fileIcon: filePath }}
      subtitle={showFilePermissions ? fileData.permissions : ""}
      accessories={[
        {
          text: showFileSize
            ? (filesize(fileData.size, { round: 0, roundingMethod: "floor", spacer: "" }) as string)
            : "",
        },
      ]}
      actions={
        <ActionPanel>
          <Action.Open title="Open File" target={filePath} />
          <Action.ShowInFinder path={filePath} />
          <Action.OpenWith path={filePath} shortcut={{ modifiers: ["cmd"], key: "o" }} />
          <Action.CopyToClipboard
            title="Copy File Path"
            content={filePath}
            shortcut={{ modifiers: ["opt", "shift"], key: "c" }}
          />
          <ActionsGoDirectoryPair currentFolderPath={currentFolderPath} subDirectoryPath={null} />
        </ActionPanel>
      }
    />
  );
}

export function SymlinkItem(props: { fileData: FileDataType }) {
  const { fileData } = props;
  const currentFolderPath = fileData.path;

  const { showFilePermissions } = getExtPreferences();
  const filePath = `${currentFolderPath}/${fileData.name}`;
  const a = readlinkSync(filePath);
  const originalPath = a.startsWith("/") ? a : `${currentFolderPath}/${a}`;
  const originalFileData = lstatSync(originalPath);

  if (originalFileData.isDirectory()) {
    return (
      <List.Item
        id={filePath}
        title={fileData.name}
        icon={{ fileIcon: filePath }}
        subtitle={showFilePermissions ? fileData.permissions : ""}
        actions={
          <ActionPanel>
            <Action.Push
              title="Open Symlink Directory"
              icon={Icon.ArrowRight}
              target={<Directory path={originalPath} />}
            />
            <Action.OpenWith path={filePath} shortcut={{ modifiers: ["cmd"], key: "o" }} />
            <Action.CopyToClipboard
              title="Copy Symlink Path"
              content={filePath}
              shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
            />
            <Action.CopyToClipboard
              title="Copy Original Directory Path"
              content={filePath}
              shortcut={{ modifiers: ["cmd", "opt"], key: "c" }}
            />
            <ActionsGoDirectoryPair currentFolderPath={currentFolderPath} subDirectoryPath={originalPath} />
          </ActionPanel>
        }
      />
    );
  } else {
    return (
      <List.Item
        id={filePath}
        title={fileData.name}
        icon={{ fileIcon: filePath }}
        subtitle={showFilePermissions ? fileData.permissions : ""}
        actions={
          <ActionPanel>
            <Action.Open title="Open File" target={originalPath} />
            <Action.OpenWith path={filePath} shortcut={{ modifiers: ["cmd"], key: "o" }} />
            <Action.CopyToClipboard
              title="Copy Symlink Path"
              content={filePath}
              shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
            />
            <Action.CopyToClipboard
              title="Copy Original File Path"
              content={originalPath}
              shortcut={{ modifiers: ["cmd", "opt"], key: "c" }}
            />
            <ActionsGoDirectoryPair currentFolderPath={currentFolderPath} subDirectoryPath={null} />
          </ActionPanel>
        }
      />
    );
  }
}

export function createItem(fileData: FileDataType) {
  const filePath = `${fileData.path}/${fileData.name}`;
  if (fileData.type === "directory") {
    return <DirectoryItem fileData={fileData} key={filePath} />;
  } else if (fileData.type === "file") {
    return <FileItem fileData={fileData} key={filePath} />;
  } else if (fileData.type === "symlink") {
    return <SymlinkItem fileData={fileData} key={filePath} />;
  } else {
    showToast(Toast.Style.Failure, "Unsupported file type", `File type: ${fileData.type}`);
  }
}

export function getDirectoryData(path: string): FileDataType[] {
  const preferences = getExtPreferences();
  let files: string[] = readdirSync(path);
  if (!preferences.showDots) {
    files = files.filter((file) => !file.startsWith("."));
  }
  if (!preferences.caseSensitive) {
    files = files.sort((a: string, b: string) => {
      if (a.toLowerCase() < b.toLowerCase()) return -1;
      if (a.toLowerCase() > b.toLowerCase()) return 1;
      else return 0;
    });
  }

  const data: FileDataType[] = [];

  for (const file of files) {
    const fileData = lstatSync(`${path}/${file}`);
    let fileType: FileType = "other";
    if (fileData.isDirectory()) fileType = "directory";
    if (fileData.isFile()) fileType = "file";
    if (fileData.isSymbolicLink()) fileType = "symlink";

    const permissions: string = (fileData.mode & parseInt("777", 8)).toString(8); // convert from number to octal
    const size: number = fileData.size;

    const d: FileDataType = {
      type: fileType,
      name: file,
      size: size,
      permissions: permissions,
      path: path,
    };
    data.push(d);
  }
  return data;
}
