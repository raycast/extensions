import { execSync } from "child_process";
import { escapeAppleScript, escapeShellPath, log } from "./helpers";

// Removes files with admin privileges
export async function removeWithAdmin(files: string[]): Promise<void> {
  const tempScript = `/tmp/uninstall_${Date.now()}.sh`;
  const scriptContent = [
    "#!/bin/bash",
    "set -e",
    "",
    "error_count=0",
    "",
    "remove_file() {",
    '  if [ -e "$1" ]; then',
    '    rm -rf "$1" || ((error_count++))',
    "  fi",
    "}",
    "",
    ...files.map((file) => `remove_file ${escapeShellPath(file)}`),
    "",
    "if [ $error_count -gt 0 ]; then",
    '  echo "Failed to remove $error_count files"',
    "  exit 1",
    "fi",
    "",
    "exit 0",
  ].join("\n");

  try {
    execSync(`echo ${escapeShellPath(scriptContent)} > ${tempScript}`);
    execSync(`chmod +x ${tempScript}`);

    const command = `do shell script "${escapeAppleScript(tempScript)}" with administrator privileges`;
    execSync(`osascript -e '${command}'`);

    execSync(`rm ${tempScript}`);
  } catch (error) {
    log("Admin removal failed:", error);
    throw new Error("Failed to remove files with administrator privileges. Please try again.");
  }
}
