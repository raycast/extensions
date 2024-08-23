import untildify from "untildify";
import { ActionPanel, Action, List, Color, Icon, Detail, useNavigation } from "@raycast/api";
import { get_FolderPaths, open_File_InVSCode } from "./utils-open";
import { getFiles } from "./utils-file";
import { get_pref_openWith_name, get_pref_openWith_path, get_pref_siteFolder } from "./utils-preference";
import { open } from "@raycast/api";
/**
 * Function to render an action panel for a file item, providing various actions like opening the file, navigating within folders, and performing other file-related tasks.
 * Parameters:
 * -  props: Object containing information about the file item, including its path.
 * Returns:
 * -  React component representing an ActionPanel with sections for different actions like opening the file, navigating, copying path, revealing in Finder, and opening with other applications.
 */
function ListFile_Item_Action(props: { file: { file: string; path: string; lastModifiedAt: Date } }) {
  const { push, pop } = useNavigation();
  return (
    <ActionPanel>
      <ActionPanel.Section title="Open">
        <Action.Push title="Open File/Folder" icon={Icon.ArrowDown} target={<ListFiles _path_={props.file.path} />} />
        <Action
          title={`Open with ${get_pref_openWith_name()}`}
          icon={Icon.CodeBlock}
          shortcut={{ modifiers: ["cmd"], key: "o" }}
          onAction={() => {
            open(props.file.path, get_pref_openWith_path());
          }}
        />
      </ActionPanel.Section>
      <ActionPanel.Section title="Navigation">
        <Action
          title="Open Current Folder"
          icon={Icon.ArrowDown}
          shortcut={{ modifiers: ["cmd"], key: "]" }}
          onAction={() => {
            push(<ListFiles _path_={props.file.path} />);
          }}
        />
        <Action
          title="Exit to Last Folder"
          icon={Icon.ArrowUp}
          shortcut={{ modifiers: ["cmd"], key: "[" }}
          onAction={pop}
        />
      </ActionPanel.Section>
      <ActionPanel.Section title="Other Action">
        <Action.CopyToClipboard
          title="Copy Path"
          content={props.file.path}
          shortcut={{ modifiers: ["cmd"], key: "c" }}
        />
        <Action.ShowInFinder
          title="Reveal in Finder"
          path={props.file.path}
          shortcut={{ modifiers: ["cmd", "ctrl"], key: "r" }}
        />
        <Action.OpenWith
          title="Open with ..."
          path={props.file.path}
          shortcut={{ modifiers: ["cmd", "shift"], key: "enter" }}
        />
      </ActionPanel.Section>
    </ActionPanel>
  );
}

/**
 * Renders a list item component for displaying file information and providing various actions for interacting with the file.
 * Parameters:
 * -  props: any - An object containing file information to be displayed.
 * Returns:
 * -  React component - A list item component displaying file details and actions like opening the file, navigating to folders, copying file path, revealing in Finder, and opening with other applications.
 */
function ListFile_Item(props: { file: { file: string; path: string; lastModifiedAt: Date } }) {
  return (
    <List.Item
      key={props.file.path}
      title={props.file.file}
      icon={{ fileIcon: props.file.path }}
      quickLook={{ path: props.file.path, name: props.file.file }}
      accessories={[
        {
          tag: {
            color: Color.SecondaryText,
            value: props.file.lastModifiedAt,
          },
        },
      ]}
      actions={<ListFile_Item_Action file={props.file}></ListFile_Item_Action>}
    />
  );
}

/**
 * Function to list files based on the provided path.
 * Parameters:
 * -  props: any - The properties object containing the path information.
 * Returns:
 * -  React component - A list of files rendered as a React component.
 */
function ListFiles(props: { _path_: string }) {
  try {
    const _listFiles_ = getFiles(untildify(props._path_));
    const _listFiles_sorted = _listFiles_.sort((file_a, file_b) => {
      return file_a.file.localeCompare(file_b.file);
    });
    return (
      <List>
        {_listFiles_sorted.length === 0 && <List.EmptyView title="No file found" description="" />}
        {_listFiles_sorted.map((file) => (
          <ListFile_Item file={file} key={file.path} />
        ))}
      </List>
    );
  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes("not a directory")) {
        const file_path = props._path_;
        const folder_path_s = get_FolderPaths(props._path_);
        const folder_path = "/" + folder_path_s[folder_path_s.length - 1];
        open_File_InVSCode(file_path, folder_path);
        return <Detail markdown={`**ERROR !!!** \n ${error.message}`} />;
      } else {
        return <Detail markdown={`**ERROR !!!** \n ${error.message}`} />;
      }
    } else {
      return <Detail markdown={`**ERROR !!!**`} />;
    }
  }
}

/**
 * This function exports a default component that retrieves preference values using the getPreferenceValues function and renders a ListFiles component with the specified path based on the pref_siteFolder preference.
 * Returns:
 * - A ListFiles component with the path specified by the pref_siteFolder preference.
 */
export default () => {
  return <ListFiles _path_={get_pref_siteFolder()} />;
};
