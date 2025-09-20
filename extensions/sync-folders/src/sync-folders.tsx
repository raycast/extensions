import { Action, ActionPanel, Color, confirmAlert, Form, Icon } from "@raycast/api";
import fs from "fs";
import { useState } from "react";
import { useSyncFolders } from "./hooks";

interface SyncUpFormValues {
  source_folder: string[];
  dest_folder: string[];
  delete: boolean;
}

export default function Command() {
  const { runSyncFolders } = useSyncFolders();

  const [sourceFolderError, setSourceFolderError] = useState<string | undefined>();
  const [destFolderError, setDestFolderError] = useState<string | undefined>();

  function dropSourceFolderErrorIfNeeded() {
    if (sourceFolderError && sourceFolderError.length > 0) {
      setSourceFolderError(undefined);
    }
  }

  function dropDestFolderErrorIfNeeded() {
    if (destFolderError && destFolderError.length > 0) {
      setDestFolderError(undefined);
    }
  }

  function isEmptyFolder(folder: string) {
    return folder === undefined || folder?.length == 0;
  }

  function isNotDirectory(folder: string) {
    return !fs.existsSync(folder) || !fs.lstatSync(folder).isDirectory();
  }

  function validateFolders(source_folder: string, dest_folder: string) {
    if (isEmptyFolder(source_folder)) {
      setSourceFolderError("The field should't be empty!");
      return true;
    } else if (isNotDirectory(source_folder)) {
      setSourceFolderError("Source folder does not exist or is not a directory");
      return true;
    } else {
      setSourceFolderError(undefined);
    }

    if (isEmptyFolder(dest_folder)) {
      setDestFolderError("The field should't be empty!");
      return true;
    } else if (isNotDirectory(dest_folder)) {
      setDestFolderError("Destination folder does not exist or is not a directory");
      return true;
    } else if (source_folder === dest_folder) {
      setDestFolderError("Source and destination folders should be different");
      return true;
    } else {
      setDestFolderError(undefined);
    }

    return false;
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Start Sync"
            style={Action.Style.Regular}
            onSubmit={async (values: SyncUpFormValues) => {
              const source_folder = values.source_folder[0];
              const dest_folder = values.dest_folder[0];
              const delete_dest = values.delete;

              const error = validateFolders(source_folder, dest_folder);
              if (error) {
                return false;
              }

              if (
                await confirmAlert({
                  title: "Sync Folders",
                  message: "Are you sure you want to Sync Folders?",
                  icon: { source: Icon.Warning, tintColor: Color.Red },
                })
              ) {
                runSyncFolders({
                  name: "Sync Folders",
                  source_folder,
                  dest_folder,
                  delete_dest,
                });
              }
            }}
          />
        </ActionPanel>
      }
    >
      <Form.Description
        title="Sync Folders"
        text="Here you can sync two folders. The source folder will be copied to the destination folder. If the delete option is enabled, any files in the destination folder that are not in the source folder will be deleted."
      />

      <Form.FilePicker
        title="Select Source Folder"
        id="source_folder"
        allowMultipleSelection={false}
        canChooseDirectories
        canChooseFiles={false}
        error={sourceFolderError}
        onChange={dropSourceFolderErrorIfNeeded}
        onBlur={(event) => {
          if (event.target.value?.length == 0) {
            setSourceFolderError("The field should't be empty!");
          } else {
            dropSourceFolderErrorIfNeeded();
          }
        }}
      />
      <Form.FilePicker
        title="Select Dest Folder"
        id="dest_folder"
        allowMultipleSelection={false}
        canChooseDirectories
        canChooseFiles={false}
        error={destFolderError}
        onChange={dropDestFolderErrorIfNeeded}
        onBlur={(event) => {
          if (event.target.value?.length == 0) {
            setDestFolderError("The field should't be empty!");
          } else {
            dropDestFolderErrorIfNeeded();
          }
        }}
      />
      <Form.Checkbox id="delete" label="Delete" />
    </Form>
  );
}
