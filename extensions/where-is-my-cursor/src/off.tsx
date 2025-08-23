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
  const command = `"${helperPath}" off`;

  exec(command, (error) => {
    if (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to turn off cursor highlight",
        message: error.message,
      });
    }
  });
  closeMainWindow({
    clearRootSearch: true,
    popToRootType: PopToRootType.Immediate,
  });
}
