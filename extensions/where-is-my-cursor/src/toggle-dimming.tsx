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
  const command = `"${helperPath}" -p simple`;

  exec(command, (error) => {
    if (error) {
      showFailureToast("Failed to locate cursor", error);
    }
  });
  closeMainWindow({
    clearRootSearch: true,
    popToRootType: PopToRootType.Immediate,
  });
}
