import {
  ActionPanel,
  showToast,
  Toast,
  getPreferenceValues,
  Icon,
  Action,
  Alert,
  confirmAlert,
  Form,
  useNavigation,
} from "@raycast/api";
import { filesize } from "filesize";
import fs from "node:fs";
import { basename, dirname, resolve } from "node:path";
import { homedir } from "node:os";
import { useState } from "react";
import { DirectoryItem } from "./components/directory-item";
import { FileItem } from "./components/file-item";
import { SymlinkItem } from "./components/symlink-item";
import { FileDataType, FileType } from "./types";

export async function deleteFile(filePath: string, fileName: string, refresh: () => void) {
  const options: Alert.Options = {
    title: "Permanently Delete File?",
    message: `Are you sure you want to delete ${fileName}? This action cannot be undone.`,
    icon: Icon.Eraser,
    primaryAction: {
      title: "Delete",
      style: Alert.ActionStyle.Destructive,
      onAction: async () => {
        fs.rmSync(filePath);
        refresh();
        showToast(Toast.Style.Success, "File Deleted", `${fileName}`);
      },
    },
  };

  await confirmAlert(options);
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
        fs.rmSync(folderPath, { recursive: true, force: true });
        refresh();
        showToast(Toast.Style.Success, "Directory Deleted", `${folderName}`);
      },
    },
  };

  await confirmAlert(options);
}

export function getFileSize(fileData: FileDataType): string {
  return filesize(fileData.size, { round: 0, spacer: "" });
}

export function getStartDirectory(): string {
  let { startDirectory } = getPreferenceValues();
  if (startDirectory.startsWith("~")) {
    startDirectory = startDirectory.replace("~", homedir());
  }
  return resolve(startDirectory);
}

export function createItem(fileData: FileDataType, refresh: () => void, preferences: Preferences) {
  const filePath = `${fileData.path}/${fileData.name}`;
  if (fileData.type === "directory") {
    return <DirectoryItem fileData={fileData} key={filePath} refresh={refresh} preferences={preferences} />;
  } else if (fileData.type === "file") {
    return <FileItem fileData={fileData} key={filePath} refresh={refresh} preferences={preferences} />;
  } else if (fileData.type === "symlink") {
    return <SymlinkItem fileData={fileData} key={filePath} refresh={refresh} preferences={preferences} />;
  } else {
    showToast(Toast.Style.Failure, "Unsupported file type", `File type: ${fileData.type}`);
  }
}

export function getDirectoryData(path: string): FileDataType[] {
  const preferences = getPreferenceValues<Preferences>();
  let files: string[] = fs.readdirSync(path);
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
    const fileData = fs.lstatSync(`${path}/${file}`);
    let fileType: FileType = "other";
    if (fileData.isDirectory()) fileType = "directory";
    if (fileData.isFile()) fileType = "file";
    if (fileData.isSymbolicLink()) fileType = "symlink";

    // ignore other files
    if (fileType === "other") continue;

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

export function RenameForm(props: { filePath: string; refresh: () => void; typeName: string }) {
  const [itemName, setItemName] = useState<string>(basename(props.filePath));
  const { pop } = useNavigation();

  function renameItem() {
    const newFilePath = `${dirname(props.filePath)}/${itemName}`;
    if (props.filePath !== newFilePath) {
      fs.renameSync(props.filePath, newFilePath);
      showToast(Toast.Style.Success, `${props.typeName} Renamed`, `${basename(props.filePath)} -> ${itemName}`);
      props.refresh();
      pop();
    }
  }

  return (
    <Form
      navigationTitle={basename(props.filePath)}
      actions={
        <ActionPanel>
          <Action title={`RenameForm ${props.typeName}`} onAction={renameItem} icon={Icon.Pencil} />
          <Action title="Cancel" shortcut={{ modifiers: ["cmd"], key: "." }} onAction={pop} icon={Icon.Undo} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="itemName"
        title={`RenameForm ${props.typeName}`}
        placeholder="Enter new name"
        value={itemName}
        onChange={setItemName}
      />
    </Form>
  );
}
