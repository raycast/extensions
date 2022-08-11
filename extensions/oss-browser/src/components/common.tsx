import {
  ActionPanel,
  Action,
  Icon,
  getSelectedFinderItems,
  showToast,
  Toast,
  Form,
  useNavigation,
  Color,
  Detail,
  openCommandPreferences,
} from "@raycast/api";
import { useState } from "react";
import { createFolder, uploadObject } from "../utils";
import { Folder } from "./folder";

export function CommonActions(props: { currentFolder: string; file?: IObject; refresh: () => void; marks: string[] }) {
  return (
    <ActionPanel.Section title="Common Actions">
      <Action.Push
        title="New Folder"
        shortcut={{ modifiers: ["cmd"], key: "n" }}
        icon={Icon.NewFolder}
        target={<NewFolder path={props.currentFolder} refresh={props.refresh}></NewFolder>}
      ></Action.Push>
      <Action
        title="Upload to Current Folder"
        icon={Icon.Upload}
        shortcut={{ modifiers: ["cmd"], key: "u" }}
        onAction={() => {
          uploadFiles(props.currentFolder, props.refresh);
        }}
      ></Action>
      <BookMarks marks={props.marks} />
      <Action
        icon={Icon.ComputerChip}
        title="Open Preferences"
        shortcut={{ modifiers: ["cmd"], key: "p" }}
        onAction={openCommandPreferences}
      />
    </ActionPanel.Section>
  );
}

function NewFolder(props: { path: string; refresh: () => void }) {
  interface FolderName {
    name: string;
  }
  const [nameError, setNameError] = useState<string | undefined>();
  const { pop } = useNavigation();

  function dropNameErrorIfNeeded() {
    if (nameError && nameError.length > 0) {
      setNameError(undefined);
    }
  }

  function validName(name?: string): boolean {
    if (!name) {
      setNameError("The name should't be empty");
      return false;
    }
    if (name.includes("//")) {
      setNameError("The name can't include //");
      return false;
    }
    return true;
  }

  async function submitCreate(values: FolderName) {
    if (!validName(values.name)) {
      return;
    }
    try {
      await createFolder(values.name, props.path);
      showToast({
        title: "Folder created",
        style: Toast.Style.Success,
      });
      props.refresh();
      pop();
    } catch (error) {
      showToast({
        title: "Failed to create Folder",
        style: Toast.Style.Failure,
      });
    }
  }

  return (
    <Form
      navigationTitle="New Folder"
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Create Folder" onSubmit={submitCreate} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="name"
        autoFocus
        placeholder="Enter folder name"
        error={nameError}
        onChange={dropNameErrorIfNeeded}
        onBlur={(event) => {
          if (validName(event.target.value)) {
            dropNameErrorIfNeeded();
          }
        }}
      />
    </Form>
  );
}

export async function uploadFiles(folder: string, refresh: () => void) {
  let selectedFiles = [];
  try {
    selectedFiles = await getSelectedFinderItems();
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Please activate the Finder window",
    });
    return;
  }
  if (!selectedFiles.length) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Please select some files in Finder",
    });
    return;
  }
  await showToast({
    style: Toast.Style.Animated,
    title: "Uploading the Files...",
  });
  try {
    const uploadPromises = selectedFiles.map(async (fileItem) => {
      try {
        await uploadObject(fileItem.path, folder);
      } catch (error) {
        return;
      }
    });
    await Promise.all(uploadPromises);
    await showToast({
      style: Toast.Style.Success,
      title: "Files uploaded",
    });
    refresh();
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Failed to upload the Files",
    });
  }
}

function BookMarks(props: { marks: string[] }) {
  return (
    <ActionPanel.Submenu title="Open Bookmarks" shortcut={{ modifiers: ["cmd", "shift"], key: "b" }} icon={Icon.Stars}>
      {props.marks.map((mark) => (
        <Action.Push
          key={mark}
          icon={{ source: Icon.Folder, tintColor: Color.Yellow }}
          title={mark}
          target={<Folder path={mark}></Folder>}
        />
      ))}
    </ActionPanel.Submenu>
  );
}

export function ErrView() {
  const markdown = `
  # Opps! \n
  ⚠️ Something went wrong! Please go to Preferences to check the configuration
  `;
  return (
    <Detail
      markdown={markdown}
      actions={
        <ActionPanel>
          <Action icon={Icon.ComputerChip} title="Open Preferences" onAction={openCommandPreferences} />
        </ActionPanel>
      }
    ></Detail>
  );
}
