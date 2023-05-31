import {
  ActionPanel,
  List,
  showToast,
  Toast,
  getPreferenceValues,
  Icon,
  Detail,
  Action,
  Alert,
  confirmAlert,
  Color,
  Form,
  useNavigation,
} from "@raycast/api";
import { promisify } from "node:util";
import { exec as _exec } from "node:child_process";
import { filesize } from "filesize";
import { existsSync, lstatSync, readdirSync, readlinkSync } from "node:fs";
import { basename, dirname, resolve } from "node:path";
import { homedir } from "node:os";
import { useState } from "react";

const exec = promisify(_exec);

export type FileType = "directory" | "file" | "symlink" | "other";

export type FileDataType = {
  type: FileType;
  name: string;
  size: number;
  permissions: string;
  path: string;
};

export type PreferencesType = {
  showDots: boolean;
  directoriesFirst: boolean;
  caseSensitive: boolean;
  showFilePermissions: boolean;
  showFileSize: boolean;
  startDirectory: string;
  showDeleteActions: boolean;
  standardShortcuts: boolean;
};

export async function deleteFile(filePath: string, fileName: string, refresh: () => void) {
  const options: Alert.Options = {
    title: "Permanently Delete File?",
    message: `Are you sure you want to delete ${fileName}? This action cannot be undone.`,
    icon: Icon.Eraser,
    primaryAction: {
      title: "Delete",
      style: Alert.ActionStyle.Destructive,
      onAction: async () => {
        await runShellScript(`rm -rf "${filePath}"`);
        refresh();
        showToast(Toast.Style.Success, "File Deleted", `${fileName}`);
      },
    },
  };

  await confirmAlert(options);

  return;
}

export async function deleteDirectory(folderPath: string, folderName: string, refresh: () => void) {
  const options: Alert.Options = {
    title: "Permanently Delete Directory?",
    message: `Are you sure you want to delete ${folderName}? This action cannot be undone.`,
    icon: Icon.Eraser,
    primaryAction: {
      title: "Delete",
      style: Alert.ActionStyle.Destructive,
      onAction: async () => {
        await runShellScript(`rm -rf "${folderPath}"`);
        refresh();
        showToast(Toast.Style.Success, "Directory Deleted", `${folderName}`);
      },
    },
  };

  await confirmAlert(options);

  return;
}

export function getFileSize(preferences: PreferencesType, fileData: FileDataType): string {
  if (preferences.showFileSize) {
    return String(filesize(fileData.size, { round: 0, spacer: "" }));
  } else {
    return "";
  }
}

export async function runShellScript(command: string) {
  const { stdout, stderr } = await exec(command);
  return { stdout, stderr };
}

export function getStartDirectory(): string {
  let { startDirectory } = getPreferenceValues();
  startDirectory = startDirectory.replace("~", homedir());
  return resolve(startDirectory);
}

export function DirectoryItem(props: { fileData: FileDataType; refresh: () => void }) {
  const preferences: PreferencesType = getPreferenceValues();
  const filePath = `${props.fileData.path}/${props.fileData.name}`;

  return (
    <List.Item
      id={filePath}
      title={props.fileData.name}
      subtitle={preferences.showFilePermissions ? props.fileData.permissions : ""}
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
          <Action.Push
            target={<RenameItem filePath={filePath} refresh={props.refresh} isDirectory={true} />}
            title="Rename Directory"
            shortcut={{ modifiers: ["cmd"], key: "r" }}
            icon={Icon.Pencil}
          />
          <ActionPanel.Section>
            <Action.Trash
              title="Move to Trash"
              shortcut={
                preferences.standardShortcuts ? { modifiers: ["ctrl"], key: "x" } : { modifiers: ["cmd"], key: "t" }
              }
              paths={filePath}
              onTrash={() => {
                showToast(Toast.Style.Success, "Moved to Trash", `Directory: ${filePath}`);
                props.refresh();
              }}
            />
            {preferences.showDeleteActions && (
              <Action
                title="Delete Directory"
                icon={Icon.Eraser}
                style={Action.Style.Destructive}
                shortcut={
                  preferences.standardShortcuts
                    ? { modifiers: ["ctrl", "shift"], key: "x" }
                    : { modifiers: ["cmd"], key: "d" }
                }
                onAction={() => deleteDirectory(filePath, props.fileData.name, props.refresh)}
              />
            )}
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}

export function FileItem(props: { fileData: FileDataType; refresh: () => void }) {
  const preferences: PreferencesType = getPreferenceValues();
  const filePath = `${props.fileData.path}/${props.fileData.name}`;
  return (
    <List.Item
      key={filePath}
      id={filePath}
      title={props.fileData.name}
      icon={{ fileIcon: filePath }}
      subtitle={preferences.showFilePermissions ? props.fileData.permissions : ""}
      accessories={[
        {
          icon: Icon.HardDrive,
          text: getFileSize(preferences, props.fileData),
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
          <Action.Push
            target={<RenameItem filePath={filePath} refresh={props.refresh} isDirectory={false} />}
            title={`Rename File`}
            icon={Icon.Pencil}
            shortcut={{ modifiers: ["cmd"], key: "r" }}
          />

          <ActionPanel.Section>
            <Action.Trash
              title="Move to Trash"
              shortcut={
                preferences.standardShortcuts ? { modifiers: ["ctrl"], key: "x" } : { modifiers: ["cmd"], key: "t" }
              }
              paths={filePath}
              onTrash={() => {
                showToast(Toast.Style.Success, "Moved to Trash", `File: ${filePath}`);
                props.refresh();
              }}
            />
            {preferences.showDeleteActions && (
              <Action
                title="Delete File"
                icon={Icon.Eraser}
                style={Action.Style.Destructive}
                shortcut={
                  preferences.standardShortcuts
                    ? { modifiers: ["ctrl", "shift"], key: "x" }
                    : { modifiers: ["cmd"], key: "d" }
                }
                onAction={() => deleteFile(filePath, props.fileData.name, props.refresh)}
              />
            )}
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}

export function SymlinkItem(props: { fileData: FileDataType; refresh: () => void }) {
  const preferences: PreferencesType = getPreferenceValues();
  const filePath = `${props.fileData.path}/${props.fileData.name}`;
  const a = readlinkSync(filePath);
  const originalPath = a.startsWith("/") ? a : `${props.fileData.path}/${a}`;
  const originalFileData = lstatSync(originalPath, { throwIfNoEntry: false });
  if (originalFileData?.isDirectory() ?? false) {
    return (
      <List.Item
        id={filePath}
        title={props.fileData.name}
        icon={{ fileIcon: filePath }}
        subtitle={preferences.showFilePermissions ? props.fileData.permissions : ""}
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
            {preferences.showDeleteActions && (
              <Action
                title="Delete Symlink Directory"
                icon={Icon.Eraser}
                style={Action.Style.Destructive}
                shortcut={
                  preferences.standardShortcuts
                    ? { modifiers: ["ctrl", "shift"], key: "x" }
                    : { modifiers: ["cmd"], key: "d" }
                }
                onAction={() => deleteDirectory(filePath, props.fileData.name, props.refresh)}
              />
            )}
          </ActionPanel>
        }
      />
    );
  } else {
    return (
      <List.Item
        id={filePath}
        title={props.fileData.name}
        icon={{ fileIcon: filePath }}
        subtitle={preferences.showFilePermissions ? props.fileData.permissions : ""}
        accessories={
          !originalFileData
            ? [{ icon: { source: Icon.ExclamationMark, tintColor: Color.Red }, tooltip: "Broken Symlink" }]
            : []
        }
        actions={
          <ActionPanel>
            {originalFileData && (
              <>
                <Action.Open title="Open File" target={originalPath} />
                <Action.OpenWith path={filePath} shortcut={{ modifiers: ["cmd"], key: "o" }} />
              </>
            )}
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
            {preferences.showDeleteActions && (
              <Action
                title="Delete Symlink File"
                icon={Icon.Eraser}
                style={Action.Style.Destructive}
                shortcut={
                  preferences.standardShortcuts
                    ? { modifiers: ["ctrl", "shift"], key: "x" }
                    : { modifiers: ["cmd"], key: "d" }
                }
                onAction={() => deleteFile(filePath, props.fileData.name, props.refresh)}
              />
            )}
          </ActionPanel>
        }
      />
    );
  }
}

export function createItem(fileData: FileDataType, refresh: () => void) {
  const filePath = `${fileData.path}/${fileData.name}`;
  if (fileData.type === "directory") {
    return <DirectoryItem fileData={fileData} key={filePath} refresh={refresh} />;
  } else if (fileData.type === "file") {
    return <FileItem fileData={fileData} key={filePath} refresh={refresh} />;
  } else if (fileData.type === "symlink") {
    return <SymlinkItem fileData={fileData} key={filePath} refresh={refresh} />;
  } else {
    showToast(Toast.Style.Failure, "Unsupported file type", `File type: ${fileData.type}`);
  }
}

export function getDirectoryData(path: string): FileDataType[] {
  const preferences: PreferencesType = getPreferenceValues();
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

export function Directory(props: { path: string }) {
  if (!existsSync(props.path)) {
    return <Detail markdown={`# Error: \n\nThe directory \`${props.path}\` does not exist. `} />;
  }
  const [directoryData, setDirectoryData] = useState<FileDataType[]>(() => getDirectoryData(props.path));
  const preferences: PreferencesType = getPreferenceValues();
  if (preferences.directoriesFirst) {
    const directories = directoryData.filter((file) => file.type === "directory");
    const nonDirectories = directoryData.filter((file) => file.type !== "directory");
    return (
      <List searchBarPlaceholder={`Search in ${props.path}/`}>
        <List.Section title="Directories">
          {directories.map((data) => createItem(data, () => setDirectoryData(getDirectoryData(props.path))))}
        </List.Section>
        <List.Section title="Files">
          {nonDirectories.map((data) => createItem(data, () => setDirectoryData(getDirectoryData(props.path))))}
        </List.Section>
      </List>
    );
  } else {
    return (
      <List searchBarPlaceholder={`Search in ${props.path}/`}>
        {directoryData.map((data) => createItem(data, () => setDirectoryData(getDirectoryData(props.path))))}
      </List>
    );
  }
}

export function RenameItem(props: { filePath: string; refresh: () => void; isDirectory: boolean }) {
  const [itemName, setItemName] = useState<string>(basename(props.filePath));
  const { pop } = useNavigation();

  async function renameItem() {
    const newFilePath = `${dirname(props.filePath)}/${itemName}`;
    if (props.filePath !== newFilePath) {
      await runShellScript(`mv "${props.filePath}" "${newFilePath}"`);
      showToast(
        Toast.Style.Success,
        `${props.isDirectory ? "Directory" : "File"} Renamed`,
        `${basename(props.filePath)} -> ${itemName}`
      );
      props.refresh();
      pop();
    }
    return;
  }

  return (
    <Form
      navigationTitle={basename(props.filePath)}
      actions={
        <ActionPanel>
          <Action
            title={`Rename ${props.isDirectory ? "Directory" : "File"}`}
            onAction={renameItem}
            icon={Icon.Pencil}
          />
          <Action title="Cancel" shortcut={{ modifiers: ["cmd"], key: "." }} onAction={pop} icon={Icon.Undo} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="itemName"
        title={`Rename ${props.isDirectory ? "Directory" : "File"}`}
        placeholder="Enter new name"
        value={itemName}
        onChange={setItemName}
      />
    </Form>
  );
}
