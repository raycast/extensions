import { exec } from "child_process";
import { closeMainWindow, PopToRootType, environment } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { join } from "path";

const helperPath = join(environment.assetsPath, "LocateCursor");

export default function main() {
  const command = `"${helperPath}"`;

  try {
    exec(command, (error) => {
      if (error) {
        showFailureToast(error, { title: "Failed to locate cursor" });
      }
      closeMainWindow({
        clearRootSearch: true,
        popToRootType: PopToRootType.Immediate,
      });
    });
  } catch (error) {
    showFailureToast(error, { title: "Failed to execute command" });
  }
}
