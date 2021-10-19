import {
  ActionPanel,
  getPreferenceValues,
  CopyToClipboardAction,
  List,
  useNavigation,
  ShowInFinderAction,
  OpenWithAction,
  OpenAction
} from "@raycast/api";
import * as fs from "fs";
import { homedir } from "os";
let push: (component: unknown) => void;

function createItem(path: string, fileName: string) {
  const filePath = `${path}/${fileName}`
  const fileData = fs.lstatSync(filePath);
  if (fileData.isDirectory()) {
    return (
      <List.Item
        key={filePath}
        id={filePath}
        title={fileName}
        icon={{ fileIcon: filePath }}
        actions={
          <ActionPanel>
            <ActionPanel.Item title="Open Directory" onAction={() => push(openDirectory(filePath))} />
            <ShowInFinderAction path={filePath} />
            <CopyToClipboardAction title="Copy Directory Path" content={filePath} shortcut={{ modifiers: ["cmd", "shift"], key: "c" }} />
          </ActionPanel>
        }
      />
    );
  } else if (fileData.isFile()) {
    return (
      <List.Item
        key={filePath}
        id={filePath}
        title={fileName}
        icon={{ fileIcon: filePath }}
        actions={
          <ActionPanel>
            <OpenAction title="Open File" target={path} />
            <ShowInFinderAction path={filePath} />
            <OpenWithAction path={filePath} shortcut={{ modifiers: ["cmd"], key: "o" }} />
            <CopyToClipboardAction title="Copy File Path" content={filePath} shortcut={{ modifiers: ["opt", "shift"], key: "c" }} />
          </ActionPanel>
        }
      />
    );
  } else if (fileData.isSymbolicLink()) {
    // todo
  } else {
    // todo
  }
}

function openDirectory(path: string) {
  const preferences = getPreferenceValues();
  let files: string[] = fs.readdirSync(path);
  if (!preferences.showDots) {
    files = files.filter((file) => !file.startsWith("."));
  }
  console.log(files);
  if (!preferences.caseSensitive) {
    files = files.sort((a: string, b: string) => {
      if (a.toLowerCase() < b.toLowerCase()) return -1;
      if (a.toLowerCase() > b.toLowerCase()) return 1;
      else return 0;
    });
  }
  if (preferences.directoriesFirst) {
    const directories = files.filter((file) => fs.lstatSync(`${path}/${file}`).isDirectory());
    const nonDirectories = files.filter((file) => !fs.lstatSync(`${path}/${file}`).isDirectory());
    return (<List navigationTitle={path} searchBarPlaceholder="Search for a file or directory...">
      <List.Section title="Directories">
        {directories.map(file => createItem(path, file))}
      </List.Section>
      <List.Section title="Files">
        {nonDirectories.map(file => createItem(path, file))}
      </List.Section>
    </List>
    );
  }
  return (<List navigationTitle={path} searchBarPlaceholder="Search for a file or directory...">
    {files.map(file => createItem(path, file))}
  </List>
  );
}
export default function Command() {
  push = useNavigation().push;
  return openDirectory(homedir());
}
