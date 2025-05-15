import { execSync } from "child_process";

export function getFishPath(): string {
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
    throw new Error("Fish shell not found in PATH or common locations.");
  }
}
