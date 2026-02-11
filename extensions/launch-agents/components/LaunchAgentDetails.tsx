import {
  Action,
  ActionPanel,
  Alert,
  captureException,
  Color,
  confirmAlert,
  Detail,
  Icon,
  Keyboard,
  open,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { execSync } from "child_process";
import fs from "fs";
import { useEffect, useState } from "react";
import {
  getLaunchAgentRecurrence,
  isLaunchAgentLoaded,
  isLaunchAgentOK,
  loadLaunchAgent,
  unloadLaunchAgent,
} from "../lib/plist";
import { getFileName } from "../lib/utils";
export default function LaunchAgentDetails({
  selectedFile,
  refreshList,
}: {
  selectedFile: string;
  refreshList: () => void;
}) {
  const { pop } = useNavigation();
  const [isFileLoaded, setIsFileLoaded] = useState<boolean>(false);
  const fileExists = fs.existsSync(selectedFile);

  useEffect(() => {
    if (!fileExists) {
      showFailureToast("The selected launch agent file does not exist.", { title: "File Not Found" });
      refreshList();
      pop();
    }
  }, [fileExists, pop, refreshList]);

  if (!fileExists) {
    return null;
  }

  const isFileValid = isLaunchAgentOK(selectedFile);
  const fileName = getFileName(selectedFile);
  const recurrence = getLaunchAgentRecurrence(selectedFile);

  const markdown = `
# ${fileName}

## Details

| Property                | Value                           |
|-------------------------|---------------------------------|
| Valid                   | ${isFileValid ? "✅" : "❌"}     |
| Loaded                  | ${isFileLoaded ? "✅" : "❌"}    |  
| Recurrence              | ${recurrence}                   |
| File Path               | ${selectedFile}                 |
`;

  const updateIsFileLoaded = () => {
    try {
      const output = isLaunchAgentLoaded(selectedFile);
      setIsFileLoaded(output);
    } catch {
      setIsFileLoaded(false);
    }
  };

  const confirmDeleteFile = async () => {
    await confirmAlert({
      title: "Confirm Deletion",
      message: `Are you sure you want to delete ${selectedFile}? This action cannot be undone.`,
      icon: { source: Icon.Trash, tintColor: Color.Red },
      primaryAction: {
        title: "Delete",
        style: Alert.ActionStyle.Destructive,
        onAction: deleteFile,
      },
      dismissAction: {
        title: "Cancel",
        style: Alert.ActionStyle.Cancel,
      },
    });
  };

  const deleteFile = () => {
    try {
      execSync(`rm -rf ${selectedFile}`);
      showToast(Toast.Style.Success, "File Deleted", `${selectedFile} has been deleted.`);
      refreshList();
      pop();
    } catch (error) {
      console.error("Error deleting file:", error);
      showToast(Toast.Style.Failure, "Error", "Failed to delete the file.");
    }
  };

  const loadOrUnloadFile = () => {
    try {
      if (isFileLoaded) {
        unloadLaunchAgent(selectedFile);

        updateIsFileLoaded();

        if (isLaunchAgentLoaded(selectedFile)) {
          showToast(Toast.Style.Failure, "Error", "Failed to unload the file.");
        } else {
          showToast(Toast.Style.Success, "Unloaded", `${selectedFile} has been loaded.`);
        }
      } else {
        loadLaunchAgent(selectedFile);

        updateIsFileLoaded();

        if (isLaunchAgentLoaded(selectedFile)) {
          showToast(Toast.Style.Success, "Loaded", `${selectedFile} has been loaded.`);
        } else {
          showToast(Toast.Style.Failure, "Error", "Failed to load the file.");
        }
      }
    } catch (error) {
      console.error("Error loading/unloading file:", error);
      showToast(Toast.Style.Failure, "Error", "Failed to load/unload the file.");
    }
  };

  const handleOpenFile = async () => {
    const app = "code";

    try {
      await open(selectedFile, "code");
    } catch (e: unknown) {
      captureException(e);
      showFailureToast(e, { title: `Could not open file in ${app}` });
    }
  };

  useEffect(() => {
    updateIsFileLoaded();
  }, [selectedFile]);

  return (
    <Detail
      markdown={markdown}
      actions={
        <ActionPanel>
          <Action
            icon={isFileLoaded ? Icon.Stop : Icon.Play}
            title={isFileLoaded ? "Unload" : "Load"}
            onAction={loadOrUnloadFile}
          />
          <Action icon={Icon.Folder} title="Open with Visual Studio Code" onAction={handleOpenFile} />
          <Action
            title="Remove"
            icon={Icon.Trash}
            shortcut={Keyboard.Shortcut.Common.Remove}
            style={Action.Style.Destructive}
            onAction={confirmDeleteFile}
          />
        </ActionPanel>
      }
    />
  );
}
