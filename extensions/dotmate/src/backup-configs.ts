import { showHUD, showToast, Toast } from "@raycast/api";
import { existsSync } from "fs";
import { DOTFILES } from "./dotfiles";
import { filesAreIdentical, copyFile, OperationResult } from "./utils";

function backupDotfile(dotfile: (typeof DOTFILES)[0]): OperationResult {
  if (!existsSync(dotfile.homePath)) {
    console.log(`⚠️  Skipping ${dotfile.name} (doesn't exist in home)`);
    return "skip_missing";
  }

  if (existsSync(dotfile.repoPath)) {
    // Check if files are identical
    if (filesAreIdentical(dotfile.repoPath, dotfile.homePath)) {
      console.log(`⏭️  Skipping ${dotfile.name} (files are identical)`);
      return "skip_identical";
    }
  }

  try {
    copyFile(dotfile.homePath, dotfile.repoPath);
    console.log(`✅ ${dotfile.homePath} → ${dotfile.name}`);
    return "success";
  } catch (error) {
    console.log(`❌ Failed to backup ${dotfile.name}: ${error}`);
    return "error";
  }
}

export default async function main() {
  try {
    await showToast({
      style: Toast.Style.Animated,
      title: "Backing up dotfiles...",
      message: "Backing up from home directory to repo",
    });

    console.log("📦 Backing up dotfiles from home directory -> repo...");

    let successCount = 0;
    let skipCount = 0;

    for (const dotfile of DOTFILES) {
      const result = backupDotfile(dotfile);
      if (result === "success") {
        successCount++;
      } else if (result === "skip_missing" || result === "skip_identical") {
        skipCount++;
      }
    }

    const message = `Backup complete! ${successCount} files backed up, ${skipCount} skipped.`;
    console.log(`🎉 ${message}`);

    await showHUD(`🎉 ${message}`);
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Backup failed",
      message: String(error),
    });
  }
}
