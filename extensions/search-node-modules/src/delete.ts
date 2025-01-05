import { Alert, confirmAlert, showToast, Toast } from "@raycast/api";
import { runAppleScript } from "@raycast/utils";

import { Items } from "./types";

export const handleDeleteAll = async (
  paths: string[],
  setItems: (items: Items[]) => void,
  setDeletedItems: (deletedItems: Set<string>) => void,
) => {
  try {
    const options: Alert.Options = {
      title: "Delete All",
      message: `Are you sure you want to delete all listed node_modules folders?`,
      primaryAction: {
        title: "Delete",
        style: Alert.ActionStyle.Destructive,
        onAction: async () => {
          showToast({
            title: "Deleting",
            style: Toast.Style.Animated,
          });

          await runAppleScript(
            `
            -- AppleScript to delete paths
            on run argv
              repeat with path in argv
                do shell script "rm -rf " & quoted form of path
              end repeat
            end run
            `,
            [...paths],
          );

          setItems([]);
          setDeletedItems(new Set());
          showToast({
            title: "Deleted",
            style: Toast.Style.Success,
          });
        },
      },
      dismissAction: {
        title: "Cancel",
        style: Alert.ActionStyle.Cancel,
      },
      rememberUserChoice: true,
    };

    await confirmAlert(options);
  } catch (error) {
    showToast({
      title: "Failed to delete",
      style: Toast.Style.Failure,
    });
  }
};

export const handleDelete = async (
  path: string,
  setDeletedItems: React.Dispatch<React.SetStateAction<Set<string>>>,
) => {
  try {
    const options: Alert.Options = {
      title: "Delete",
      message: `Are you sure you want to delete '${path}'?`,
      primaryAction: {
        title: "Delete",
        onAction: async () => {
          showToast({
            title: "Deleting",
            style: Toast.Style.Animated,
          });

          await runAppleScript(
            `
            -- AppleScript to delete path
            on run argv
              do shell script "rm -rf " & argv
            end run
            `,
            [path],
          );

          setDeletedItems((prev) => new Set(prev).add(path));
          showToast({
            title: "Deleted",
            style: Toast.Style.Success,
          });
        },
        style: Alert.ActionStyle.Destructive,
      },
      dismissAction: {
        title: "Cancel",
        style: Alert.ActionStyle.Cancel,
      },
      rememberUserChoice: true,
    };

    await confirmAlert(options);
  } catch (error) {
    showToast({
      title: "Failed to delete",
      style: Toast.Style.Failure,
    });
  }
};
