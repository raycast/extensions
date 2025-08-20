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

export default function main() {
  const command = `"${helperPath}"`;

  exec(command, (error) => {
    if (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to locate cursor",
        message: error.message,
      });
    }
  });
  exec(command, (error) => {
    if (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to locate cursor",
        message: error.message,
      });
    } else {
      closeMainWindow({
        clearRootSearch: true,
        popToRootType: PopToRootType.Immediate,
      });
    }
  });
}
