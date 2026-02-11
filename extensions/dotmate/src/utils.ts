import { existsSync, readFileSync, copyFileSync, mkdirSync } from "fs";
import { dirname } from "path";
import { DotFile } from "./dotfiles";
import { LaunchType, launchCommand } from "@raycast/api";

export type OperationResult =
  | "success"
  | "skip_missing"
  | "skip_identical"
  | "error";

export function filesAreIdentical(path1: string, path2: string): boolean {
  try {
    if (!existsSync(path1) || !existsSync(path2)) {
      return false;
    }
    const content1 = readFileSync(path1, "utf8");
    const content2 = readFileSync(path2, "utf8");
    return content1 === content2;
  } catch {
    return false;
  }
}

export function ensureDirectoryExists(filePath: string): void {
  const dir = dirname(filePath);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
}

export function copyFile(source: string, destination: string): void {
  ensureDirectoryExists(destination);
  copyFileSync(source, destination);
}

export function getFileStatus(dotfile: DotFile): string {
  const repoExists = existsSync(dotfile.repoPath);
  const homeExists = existsSync(dotfile.homePath);

  if (repoExists && homeExists) {
    if (filesAreIdentical(dotfile.repoPath, dotfile.homePath)) {
      return "✅"; // Same
    } else {
      return "🔄"; // Different
    }
  } else if (repoExists && !homeExists) {
    return "📥"; // Only in repo
  } else if (!repoExists && homeExists) {
    return "📤"; // Only in home
  } else {
    return "❌"; // Missing everywhere
  }
}

export function runCommand(commandName: string): void {
  // Launch a command within the same extension
  launchCommand({
    name: commandName,
    type: LaunchType.UserInitiated,
  });
}
