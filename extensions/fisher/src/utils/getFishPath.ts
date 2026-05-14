import { showFailureToast } from "@raycast/utils";
import { execSync } from "child_process";

export function getFishPath() {
  try {
    return execSync("which fish", { encoding: "utf-8" }).trim();
  } catch {
    const commonPaths = [
      "/opt/homebrew/bin/fish",
      "/usr/local/bin/fish",
      "/usr/bin/fish",
      "/bin/fish",
      "/snap/bin/fish",
    ];
    for (const path of commonPaths) {
      try {
        execSync(`${path} --version`);
        return path;
      } catch {
        continue;
      }
    }
    showFailureToast("Fish shell not found", {
      title: "Missing Dependency",
      message: "Could not locate Fish shell in PATH or common locations. Please install Fish or add it to your PATH.",
    });
  }
}
