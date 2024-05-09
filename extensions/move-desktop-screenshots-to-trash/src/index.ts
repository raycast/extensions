import fs from "fs";
import os from "os";
import path from "path";
import { exec } from "child_process";
import { showHUD } from "@raycast/api";

const desktopDir = path.join(os.homedir(), "Desktop");

const moveFileToTrash = (filePath: string) => {
  exec(`osascript -e 'tell application "Finder" to delete POSIX file "${filePath}"'`, (error, stdout, stderr) => {
    if (error) {
      console.error(`Error: ${error.message}`);
      return;
    }
    if (stderr) {
      console.error(`stderr: ${stderr}`);
      return;
    }
    console.log(`File moved to trash: ${filePath}`);
  });
};

fs.readdir(desktopDir, (err, files) => {
  if (err) {
    console.log("Error finding files: " + err);
    return;
  }

  let movedFilesCount = 0;

  files.forEach((filename) => {
    if ((filename.startsWith("CleanShot ") || filename.startsWith("Screenshot ")) && filename.endsWith(".png")) {
      const fullPath = path.join(desktopDir, filename);
      moveFileToTrash(fullPath);
      movedFilesCount++;
    }
  });

  if (movedFilesCount === 0) {
    showHUD("No screenshots were found to move to trash.");
  } else if (movedFilesCount === 1) {
    showHUD(`One screenshot moved to trash.`);
  } else {
    showHUD(`${movedFilesCount} screenshots moved to trash.`);
  }
});
