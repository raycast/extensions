import { showToast, Toast } from "@raycast/api";
import { execSync } from "child_process";
import { existsSync } from "fs";
import { homedir } from "os";
import { join } from "path";

export default function Command() {
  const derivedDataPath = join(homedir(), "Library/Developer/Xcode/DerivedData");

  if (!existsSync(derivedDataPath)) {
    showToast({
      style: Toast.Style.Failure,
      title: "DerivedData Folder Not Found",
    });
    return;
  }

  try {
    showToast({
      style: Toast.Style.Animated,
      title: "Clearing Derived Data...",
    });

    execSync(`rm -rf "${derivedDataPath}"/*`);

    showToast({
      style: Toast.Style.Success,
      title: "Derived Data Cleared!",
    });
  } catch (error) {
    showToast({
      style: Toast.Style.Failure,
      title: "Failed to clear Derived Data",
      message: String(error),
    });
  }
}
