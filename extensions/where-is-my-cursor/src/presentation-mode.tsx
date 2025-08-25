import { exec } from "child_process";
import { environment } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { join } from "path";

const helperPath = join(environment.assetsPath, "LocateCursor");

export default function main() {
  const command = `"${helperPath}" -p presentation`;

  exec(command, (error) => {
    if (error) {
      showFailureToast(error, { title: "Failed to start presentation mode" });
    }
  });
}
