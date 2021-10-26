import {
  ActionPanel,
  CopyToClipboardAction,
  List,
  ShowInFinderAction,
  OpenWithAction,
  OpenAction,
  Form,
  showToast,
  ToastStyle,
  SubmitFormAction,
  getPreferenceValues,
  PushAction,
  useNavigation,
  Icon,
  ToastStyle
} from "@raycast/api";
import { promisify } from "util";
import { exec as _exec } from "child_process";
const exec = promisify(_exec);
import filesize from "filesize";
import * as fs from "fs";

export type FileType = "directory" | "file" | "symlink" | "other";

export type FileDataType = {
  type: FileType;
  name: string;
  size: number;
  permissions: string;
  path: string;
}

export type PreferencesType = {
  showDots: boolean;
  directoriesFirst: boolean;
  caseSensitive: boolean;
  showFilePermissions: boolean;
  showFileSize: boolean;
}

export async function runShellScript(command: string) {
  const { stdout, stderr } = await exec(command);
  return { stdout, stderr };
}

export function CreateFile(props: { path: string }) {
  const { pop } = useNavigation();
  return (
    <Form
      actions={
        <ActionPanel>
          <SubmitFormAction onSubmit={(values: { fileName: string, fileContents: string }) => {
            const filePath = `${props.path}/${values.fileName}`;
            if (fs.existsSync(filePath)) {
              showToast(ToastStyle.Failure, "Error Creating File", "File already exists");
            } else {
              fs.writeFileSync(filePath, values.fileContents);
              showToast(ToastStyle.Success, "File Created", "File successfully created");
              pop();
            }
          }} />
        </ActionPanel>
      }
    >
      <Form.TextField title="File Name" placeholder="file.txt" id="fileName" />
      <Form.TextArea title="File Contents" placeholder="contents" id="fileContents" />
    </Form>
  );
}

export function CreateDirectory(props: { path: string }) {
  const { pop } = useNavigation();
  return (
    <Form
      actions={
        <ActionPanel>
          <SubmitFormAction onSubmit={(values: { directoryName: string }) => {
            const filePath = `${props.path}/${values.directoryName}`;
            if (fs.existsSync(filePath)) {
              showToast(ToastStyle.Failure, "Error Creating Directory", "Directory already exists");
            } else {
              fs.mkdirSync(filePath);
              showToast(ToastStyle.Success, "Directory Created", "Directory successfully created");
              pop();
            }
          }} />
        </ActionPanel>
      }
    >
      <Form.TextField title="Directory Name" placeholder="folder name" id="directoryName" />
    </Form>
  );
}

export function DirectoryItem(props: { fileData: FileDataType }) {
  const preferences: PreferencesType = getPreferenceValues();
  const filePath = `${props.fileData.path}/${props.fileData.name}`;
  return (
    <List.Item
      key={filePath}
      id={filePath}
      title={props.fileData.name}
      subtitle={preferences.showFilePermissions ? props.fileData.permissions : ""}
      icon={{ fileIcon: filePath }}
      actions={
        <ActionPanel>
          <PushAction title="Open Directory" target={<Directory path={filePath} />} />
          <ShowInFinderAction path={filePath} />
          <CopyToClipboardAction title="Copy Directory Path" content={`${filePath}/`} shortcut={{ modifiers: ["cmd", "shift"], key: "c" }} />
          <PushAction title="Create File" icon={Icon.Plus} shortcut={{ modifiers: ["cmd"], key: "n" }} target={<CreateFile path={props.fileData.path} />} />
          <PushAction title="Create Directory" icon={Icon.Plus} shortcut={{ modifiers: ["cmd", "shift"], key: "n" }} target={<CreateDirectory path={props.fileData.path} />} />
        </ActionPanel>
      }
    />
  );
}

export function FileItem(props: { fileData: FileDataType }) {
  const preferences: PreferencesType = getPreferenceValues();
  const filePath = `${props.fileData.path}/${props.fileData.name}`;
  return (
    <List.Item
      key={filePath}
      id={filePath}
      title={props.fileData.name}
      icon={{ fileIcon: filePath }}
      subtitle={preferences.showFilePermissions ? props.fileData.permissions : ""}
      accessoryTitle={preferences.showFileSize ? filesize(props.fileData.size, { round: 0, roundingMethod: "floor", spacer: "" }) : ""}
      actions={
        <ActionPanel>
          <OpenAction title="Open File" target={filePath} />
          <ShowInFinderAction path={filePath} />
          <OpenWithAction path={filePath} shortcut={{ modifiers: ["cmd"], key: "o" }} />
          <CopyToClipboardAction title="Copy File Path" content={filePath} shortcut={{ modifiers: ["opt", "shift"], key: "c" }} />
          <PushAction title="Create File" icon={Icon.Plus} shortcut={{ modifiers: ["cmd"], key: "n" }} target={<CreateFile path={props.fileData.path} />} />
          <PushAction title="Create Directory" icon={Icon.Plus} shortcut={{ modifiers: ["cmd", "shift"], key: "n" }} target={<CreateDirectory path={props.fileData.path} />} />
        </ActionPanel>
      }
    />
  );
}

export function SymlinkItem(props: { fileData: FileDataType }) {
  const preferences: PreferencesType = getPreferenceValues();
  const filePath = `${props.fileData.path}/${props.fileData.name}`;
  const a = fs.readlinkSync(filePath);
  const originalPath = a.startsWith("/") ? a : `${props.fileData.path}/${a}`;
  const originalFileData = fs.lstatSync(originalPath);
  if (originalFileData.isDirectory()) {
    return (
      <List.Item
        key={filePath}
        id={filePath}
        title={props.fileData.name}
        icon={{ fileIcon: filePath }}
        subtitle={preferences.showFilePermissions ? props.fileData.permissions : ""}
        actions={
          <ActionPanel>
            <PushAction title="Open Symlink Directory" target={<Directory path={originalPath} />} />
            <OpenWithAction path={filePath} shortcut={{ modifiers: ["cmd"], key: "o" }} />
            <CopyToClipboardAction title="Copy Symlink Path" content={filePath} shortcut={{ modifiers: ["cmd", "shift"], key: "c" }} />
            <CopyToClipboardAction title="Copy Original Directory Path" content={filePath} shortcut={{ modifiers: ["cmd", "opt"], key: "c" }} />
            <PushAction title="Create File" icon={Icon.Plus} shortcut={{ modifiers: ["cmd"], key: "n" }} target={<CreateFile path={props.fileData.path} />} />
            <PushAction title="Create Directory" icon={Icon.Plus} shortcut={{ modifiers: ["cmd", "shift"], key: "n" }} target={<CreateDirectory path={props.fileData.path} />} />
          </ActionPanel>
        }
      />
    );
  } else {
    return (
      <List.Item
        key={filePath}
        id={filePath}
        title={props.fileData.name}
        icon={{ fileIcon: filePath }}
        subtitle={preferences.showFilePermissions ? props.fileData.permissions : ""}
        actions={
          <ActionPanel>
            <OpenAction title="Open File" target={originalPath} />
            <OpenWithAction path={filePath} shortcut={{ modifiers: ["cmd"], key: "o" }} />
            <CopyToClipboardAction title="Copy Symlink Path" content={filePath} shortcut={{ modifiers: ["cmd", "shift"], key: "c" }} />
            <CopyToClipboardAction title="Copy Original File Path" content={originalPath} shortcut={{ modifiers: ["cmd", "opt"], key: "c" }} />
            <PushAction title="Create File" icon={Icon.Plus} shortcut={{ modifiers: ["cmd"], key: "n" }} target={<CreateFile path={props.fileData.path} />} />
            <PushAction title="Create Directory" icon={Icon.Plus} shortcut={{ modifiers: ["cmd", "shift"], key: "n" }} target={<CreateDirectory path={props.fileData.path} />} />
          </ActionPanel>
        }
      />
    );
  }
}

export function createItem(fileData: FileDataType) {
  if (fileData.type === "directory") {
    return (<DirectoryItem fileData={fileData} />);
  } else if (fileData.type === "file") {
    return (<FileItem fileData={fileData} />);
  } else if (fileData.type === "symlink") {
    return (<SymlinkItem fileData={fileData} />);
  } else {
    showToast(ToastStyle.Failure, "Unsupported file type", `file type: ${fileData.type}`);
  }
}

export function getDirectoryData(path: string): FileDataType[] {
  const preferences: PreferencesType = getPreferenceValues();
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

    const permissions: string = (fileData.mode & parseInt("777", 8)).toString(8); // convert from number to octal
    const size: number = fileData.size;

    const d: FileDataType = {
      type: fileType,
      name: file,
      size: size,
      permissions: permissions,
      path: path
    }
    data.push(d);
  }
  return data;
}

export function Directory(props: { path: string }) {
  const directoryData = getDirectoryData(props.path);
  const preferences: PreferencesType = getPreferenceValues();
  if (preferences.directoriesFirst) {
    const directories = directoryData.filter(file => file.type === "directory");
    const nonDirectories = directoryData.filter(file => file.type !== "directory");
    return (
      <List navigationTitle={props.path} searchBarPlaceholder="Search for a file or directory...">
        <List.Section title="Directories">
          {directories.map(data => createItem(data))}
        </List.Section>
        <List.Section title="Files">
          {nonDirectories.map(data => createItem(data))}
        </List.Section>
      </List>
    );
  } else {
    return (
      <List navigationTitle={props.path} searchBarPlaceholder="Search for a file or directory...">
        {directoryData.map(data => createItem(data))}
      </List>
    );
  }
}
