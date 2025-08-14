import { exec } from "child_process";
import {
  showToast,
  Toast,
  closeMainWindow,
  PopToRootType,
  environment,
} from "@raycast/api";
import { join } from "path";

const helperPath = join(environment.assetsPath, "LocateCursor");
// const supportPath = environment.supportPath;

export default function main() {
  // This command runs the helper without any arguments, which defaults to a 1-second highlight.
  // We still pass the support path as the first argument for consistency.
  const command = `"${helperPath}"`;

  exec(command, (error) => {
    if (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to locate cursor",
        message: error.message,
      });
    } else {
      // The success toast is optional here as the visual effect is the main feedback.
      // showToast({ style: Toast.Style.Success, title: "Cursor located" });
    }
  });
  closeMainWindow({
    clearRootSearch: true,
    popToRootType: PopToRootType.Immediate,
  });
}
