import { existsSync } from "node:fs";
import { Alert, closeMainWindow, confirmAlert, showToast, Toast, trash } from "@raycast/api";
import { getQmdDatabasePath } from "./utils/qmd";

export default async function Command() {
  const firstConfirm = await confirmAlert({
    title: "Reset QMD?",
    message: "This will delete all collections, contexts, and embeddings. The database file will be removed.",
    primaryAction: {
      title: "Continue",
      style: Alert.ActionStyle.Destructive,
    },
    dismissAction: {
      title: "Cancel",
    },
  });

  if (!firstConfirm) {
    return;
  }

  const secondConfirm = await confirmAlert({
    title: "Are you absolutely sure?",
    message: "This action cannot be undone. All QMD data will be permanently deleted.",
    primaryAction: {
      title: "Delete Everything",
      style: Alert.ActionStyle.Destructive,
    },
    dismissAction: {
      title: "Cancel",
    },
  });

  if (!secondConfirm) {
    return;
  }

  await closeMainWindow();

  const toast = await showToast({
    style: Toast.Style.Animated,
    title: "Resetting QMD...",
    message: "Deleting database",
  });

  try {
    const dbPath = getQmdDatabasePath();

    if (existsSync(dbPath)) {
      await trash(dbPath);
      toast.style = Toast.Style.Success;
      toast.title = "QMD Reset Complete";
      toast.message = "All data has been deleted";
    } else {
      toast.style = Toast.Style.Success;
      toast.title = "QMD Reset Complete";
      toast.message = "Database was already empty";
    }
  } catch (error) {
    toast.style = Toast.Style.Failure;
    toast.title = "Reset failed";
    toast.message = error instanceof Error ? error.message : "Unknown error";
  }
}
