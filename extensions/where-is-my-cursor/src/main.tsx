import { exec } from "child_process";
import { showToast, Toast } from "@raycast/api";
import { join } from "path";

// Helper path (relative to repo or installed path)
const helperPath = join(__dirname, ".", "assets", "LocateCursor");

export default async function main() {
  exec(helperPath, (error) => {
    if (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to locate cursor",
        message: error.message,
      });
    } else {
      showToast({ style: Toast.Style.Success, title: "Cursor located" });
    }
  });
}
