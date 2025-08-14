import { exec, execSync } from "child_process";
import {
  showToast,
  Toast,
  environment,
  closeMainWindow,
  PopToRootType,
  showHUD,
} from "@raycast/api";
import { join } from "path";
import * as fs from "fs";

const helperPath = join(environment.assetsPath, "LocateCursor");
const supportPath = environment.supportPath;
const lockFilePath = join(supportPath, "LocateCursor.lock");

export default function main() {
  if (fs.existsSync(lockFilePath)) {
    try {
      execSync(`"${helperPath}" off`);
      showHUD("Dimming turned off");
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to turn off Dimming",
        message: errorMessage,
      });
    }
  } else {
    exec(`"${helperPath}" on`, (error) => {
      if (error) {
        showToast({
          style: Toast.Style.Failure,
          title: "Failed to turn on Dimming",
          message: error.message,
        });
      } else {
        showHUD("Dimming turned on");
      }
    });
  }
  closeMainWindow({
    clearRootSearch: true,
    popToRootType: PopToRootType.Immediate,
  });
}
