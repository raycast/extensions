import { Alert, confirmAlert, showToast, Toast, trash } from "@raycast/api";
import { existsSync, readdirSync } from "fs";
import { homedir } from "os";
import { join } from "path";

export default async function Command() {
  const derivedDataPath = join(homedir(), "Library/Developer/Xcode/DerivedData");

  if (!existsSync(derivedDataPath)) {
    await showToast({
      style: Toast.Style.Failure,
      title: "DerivedData Folder Not Found",
    });
    return;
  }

  const confirmed = await confirmAlert({
    title: "Clear Xcode Derived Data?",
    message: "Everything inside DerivedData will be moved to the Trash. Xcode rebuilds it on your next build.",
    primaryAction: { title: "Clear Derived Data", style: Alert.ActionStyle.Destructive },
  });

  if (!confirmed) return;

  try {
    await showToast({
      style: Toast.Style.Animated,
      title: "Clearing Derived Data...",
    });

    const entries = readdirSync(derivedDataPath).map((entry) => join(derivedDataPath, entry));
    if (entries.length > 0) {
      await trash(entries);
    }

    await showToast({
      style: Toast.Style.Success,
      title: "Derived Data Cleared!",
    });
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Failed to clear Derived Data",
      message: String(error),
    });
  }
}
