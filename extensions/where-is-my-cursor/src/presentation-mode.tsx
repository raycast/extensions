import { execFile } from "child_process";
import { environment } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { join } from "path";

const helperPath = join(environment.assetsPath, "LocateCursor");

export default function main() {
  execFile(helperPath, ["-p", "presentation"], (error) => {
    if (error) {
      showFailureToast(error, { title: "Failed to start presentation mode" });
    }
  });
}
