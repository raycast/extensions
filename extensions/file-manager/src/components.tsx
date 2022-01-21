import {
  getPreferenceValues,
  List,
  ActionPanel,
  PushAction,
  Icon,
  ShowInFinderAction,
  OpenAction,
  OpenWithAction,
  CopyToClipboardAction,
  Detail,
} from "@raycast/api";
import filesize from "filesize";
import { readlinkSync, lstatSync, existsSync } from "fs";
import { FileDataType, PreferencesType, isImage, getDirectoryData, createItem } from "./utils";

export function DirectoryItem(props: { fileData: FileDataType }) {
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
          <ActionPanel.Section title={props.fileData.name}>
            <PushAction title="Open Directory" icon={Icon.ArrowRight} target={<Directory path={filePath} />} />
            <ShowInFinderAction path={filePath} />
            <OpenAction
              title="Open with Default App"
              icon={Icon.Document}
              target={filePath}
              shortcut={{ modifiers: ["cmd", "shift"], key: "o" }}
            />
            <OpenWithAction path={filePath} shortcut={{ modifiers: ["cmd"], key: "o" }} />
          </ActionPanel.Section>
          <ActionPanel.Section title="Copy">
            <CopyToClipboardAction
              title="Copy Directory Name"
              content={props.fileData.name}
              shortcut={{ modifiers: ["cmd", "shift"], key: "." }}
            />
            <CopyToClipboardAction
              title="Copy Directory Path"
              content={filePath}
              shortcut={{ modifiers: ["cmd", "shift"], key: "," }}
            />
          </ActionPanel.Section>
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
      icon={isImage(props.fileData) ? { source: filePath } : { fileIcon: filePath }}
      subtitle={preferences.showFilePermissions ? props.fileData.permissions : ""}
      accessoryTitle={
        preferences.showFileSize ? filesize(props.fileData.size, { round: 0, roundingMethod: "floor", spacer: "" }) : ""
      }
      actions={
        <ActionPanel>
          <ActionPanel.Section title={props.fileData.name}>
            <OpenAction title="Open File" target={filePath} />
            <ShowInFinderAction path={filePath} />
            <OpenWithAction path={filePath} shortcut={{ modifiers: ["cmd"], key: "o" }} />
          </ActionPanel.Section>
          <ActionPanel.Section title="Copy">
            <CopyToClipboardAction
              title="Copy File Name"
              content={props.fileData.name}
              shortcut={{ modifiers: ["cmd", "shift"], key: "." }}
            />
            <CopyToClipboardAction
              title="Copy File Path"
              content={filePath}
              shortcut={{ modifiers: ["cmd", "shift"], key: "," }}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}

export function SymlinkItem(props: { fileData: FileDataType }) {
  const preferences: PreferencesType = getPreferenceValues();
  const filePath = `${props.fileData.path}/${props.fileData.name}`;
  const a = readlinkSync(filePath);
  const originalPath = a.startsWith("/") ? a : `${props.fileData.path}/${a}`;
  const originalFileData = lstatSync(originalPath);
  const originalFileName = originalPath.split("/").at(-1) || "";
  if (originalFileData.isDirectory()) {
    return (
      <List.Item
        id={filePath}
        title={props.fileData.name}
        icon={{ fileIcon: filePath }}
        subtitle={preferences.showFilePermissions ? props.fileData.permissions : ""}
        actions={
          <ActionPanel>
            <ActionPanel.Section title={props.fileData.name}>
              <PushAction
                title="Open Symlink Directory"
                icon={Icon.ArrowRight}
                target={<Directory path={originalPath} />}
              />
              <ShowInFinderAction path={filePath} />
              <OpenAction
                title="Open with Default App"
                icon={Icon.Document}
                target={filePath}
                shortcut={{ modifiers: ["cmd", "shift"], key: "o" }}
              />
              <OpenWithAction path={filePath} shortcut={{ modifiers: ["cmd"], key: "o" }} />
            </ActionPanel.Section>
            <ActionPanel.Section title="Copy">
              <CopyToClipboardAction
                title="Copy Symlink Name"
                content={props.fileData.name}
                shortcut={{ modifiers: ["cmd", "shift"], key: "." }}
              />
              <CopyToClipboardAction
                title="Copy Symlink Path"
                content={filePath}
                shortcut={{ modifiers: ["cmd", "shift"], key: "," }}
              />
              <CopyToClipboardAction
                title="Copy Original Directory Name"
                content={originalFileName}
                shortcut={{ modifiers: ["cmd", "shift", "opt"], key: "." }}
              />
              <CopyToClipboardAction
                title="Copy Original Directory Path"
                content={originalPath}
                shortcut={{ modifiers: ["cmd", "shift", "opt"], key: "," }}
              />
            </ActionPanel.Section>
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
        actions={
          <ActionPanel>
            <ActionPanel.Section title={props.fileData.name}>
              <OpenAction title="Open Symlink File" target={originalPath} />
              <ShowInFinderAction path={filePath} />
              <OpenAction
                title="Open with Default App"
                icon={Icon.Document}
                target={filePath}
                shortcut={{ modifiers: ["cmd"], key: "o" }}
              />
              <OpenWithAction path={filePath} shortcut={{ modifiers: ["cmd", "shift"], key: "o" }} />
            </ActionPanel.Section>
            <ActionPanel.Section title="Copy">
              <CopyToClipboardAction
                title="Copy Symlink Name"
                content={props.fileData.name}
                shortcut={{ modifiers: ["cmd", "shift"], key: "." }}
              />
              <CopyToClipboardAction
                title="Copy Symlink Path"
                content={filePath}
                shortcut={{ modifiers: ["cmd", "shift"], key: "," }}
              />
              <CopyToClipboardAction
                title="Copy Original Directory Name"
                content={originalFileName}
                shortcut={{ modifiers: ["cmd", "shift", "opt"], key: "." }}
              />
              <CopyToClipboardAction
                title="Copy Original Directory Path"
                content={originalPath}
                shortcut={{ modifiers: ["cmd", "shift", "opt"], key: "," }}
              />
            </ActionPanel.Section>
          </ActionPanel>
        }
      />
    );
  }
}

export function Directory(props: { path: string }) {
  if (!existsSync(props.path)) {
    return <Detail markdown={`# Error: \n\nThe directory \`${props.path}\` does not exist. `} />;
  }
  const directoryData = getDirectoryData(props.path);
  const preferences: PreferencesType = getPreferenceValues();
  if (preferences.directoriesFirst) {
    const directories = directoryData.filter((file) => file.type === "directory");
    const nonDirectories = directoryData.filter((file) => file.type !== "directory");
    return (
      <List searchBarPlaceholder={`Search in ${props.path}`}>
        <List.Section title="Directories">{directories.map((data) => createItem(data))}</List.Section>
        <List.Section title="Files">{nonDirectories.map((data) => createItem(data))}</List.Section>
      </List>
    );
  } else {
    return (
      <List searchBarPlaceholder={`Search in ${props.path}`}>{directoryData.map((data) => createItem(data))}</List>
    );
  }
}
