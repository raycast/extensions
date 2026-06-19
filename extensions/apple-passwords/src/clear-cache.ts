import { confirmAlert, Alert, showHUD, showToast, Toast, trash } from "@raycast/api";
import { resolveAccountDbPath } from "./db";

export default async function Command() {
  const dbPath = resolveAccountDbPath();

  const confirmed = await confirmAlert({
    title: "Clear Apple Passwords Cache?",
    message:
      "This deletes the local cached accounts database file. The next search will rebuild it from Apple Passwords.",
    primaryAction: {
      title: "Delete Cache",
      style: Alert.ActionStyle.Destructive,
    },
  });

  if (!confirmed) {
    return;
  }

  try {
    await trash(dbPath);
    await showHUD("Cache cleared");
  } catch (error) {
    if (error instanceof Error && "code" in error && (error as NodeJS.ErrnoException).code === "ENOENT") {
      await showHUD("Cache already empty");
      return;
    }

    const message = error instanceof Error ? error.message : "Unknown error";
    await showToast({
      style: Toast.Style.Failure,
      title: "Clear Cache Failed",
      message,
    });
  }
}
