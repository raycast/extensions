import { showHUD, showToast, Toast } from "@raycast/api";
import { existsSync } from "fs";
import { DOTFILES } from "./dotfiles";
import { filesAreIdentical, copyFile, OperationResult } from "./utils";

function restoreDotfile(dotfile: (typeof DOTFILES)[0]): OperationResult {
  if (!existsSync(dotfile.repoPath)) {
    console.log(`⚠️  Skipping ${dotfile.name} (doesn't exist in repo)`);
    return "skip_missing";
  }

  // Check if files are identical
  if (existsSync(dotfile.homePath)) {
    if (filesAreIdentical(dotfile.repoPath, dotfile.homePath)) {
      console.log(`⏭️  Skipping ${dotfile.name} (files are identical)`);
      return "skip_identical";
    }
  }

  try {
    copyFile(dotfile.repoPath, dotfile.homePath);
    console.log(`✅ ${dotfile.name} → ${dotfile.homePath}`);
    return "success";
  } catch (error) {
    console.log(`❌ Failed to restore ${dotfile.name}: ${error}`);
    return "error";
  }
}

export default async function main() {
  try {
    await showToast({
      style: Toast.Style.Animated,
      title: "Restoring dotfiles...",
      message: "Copying from repo to home directory",
    });

    console.log("🚀 Restoring dotfiles from repo -> home directory...");

    let successCount = 0;
    let skipCount = 0;

    for (const dotfile of DOTFILES) {
      const result = restoreDotfile(dotfile);
      if (result === "success") {
        successCount++;
      } else if (result === "skip_missing" || result === "skip_identical") {
        skipCount++;
      }
    }

    const message = `Restore complete! ${successCount} files restored, ${skipCount} skipped.`;
    console.log(`🎉 ${message}`);

    await showHUD(`🎉 ${message}`);
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Restore failed",
      message: String(error),
    });
  }
}
