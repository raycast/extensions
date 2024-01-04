import fs from "fs";
import os from "os";
import path from "path";
import { execSync } from "child_process";

export const backupLocation = "/tmp/terminal-history-backup.file.txt";

/// Parse the shell history file
/// - Parameter string: The string to parse
/// - Returns: An array of commands
export function parseShellHistory(string: string) {
  const reBashHistory = /^: \d+:0;/;

  return string
    .trim()
    .split("\n")
    .map((line) => {
      if (reBashHistory.test(line)) {
        const lines = line.split(";").slice(1).join(";");
        // Remove duplicates and return
        return [...new Set(lines.split(":"))].join(":");
      }

      // ZSH just places one command on each line
      return line;
    });
}

/// Get the path to the shell history file
/// - Returns: The path to the shell history file
export function shellHistoryPath() {
  const zshHistoryPath = path.join(os.homedir(), ".zsh_history");
  const bashHistoryPath = path.join(os.homedir(), ".bash_history");

  if (fs.existsSync(zshHistoryPath)) {
    return zshHistoryPath;
  }
  if (fs.existsSync(bashHistoryPath)) {
    return bashHistoryPath;
  }
  return null;
}

/// Get the shell history
/// - Returns: An array of commands
export function getHistory() {
  const historyPath = shellHistoryPath();
  return historyPath ? parseShellHistory(fs.readFileSync(historyPath).toString()) : [];
}

/// Restore the history file from a backup location
export function restoreHistory() {
  console.log(`cp ${backupLocation} ~/.zsh_history`);
  execSync(`cp ${backupLocation} ~/.zsh_history`);
  getHistory();
}

/// Save the history file to a backup location
export function saveFile() {
  const path = shellHistoryPath() ?? "";
  console.log(`cp ${path} ${backupLocation}`);
  execSync(`cp ${path} ${backupLocation}`);
}
/// Create a ray.so link
/// - Parameter command: The command to encode
/// - Returns: A ray.so link
export function createRaySoLink(command: string): string {
  try {
    // eslint-disable-next-line no-undef
    const decodedString = btoa(command);
    return `https://ray.so/#language=shell&code=${decodedString}&padding=16&title=Terminal+History+Command&darkMode=true&background=true&theme=raindrop`;
  } catch (error) {
    console.log(`Error parsing: ${command}`);
    return "";
  }
}
