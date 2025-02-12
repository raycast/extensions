import { getFrontmostApplication, showHUD, showToast, Toast } from "@raycast/api";
import fs from "fs";
import path from "path";
import { execSync } from "child_process";

const TEMP_FILE = path.join(__dirname, "cut-files.json");

export default async function Command() {
  try {
    if (!fs.existsSync(TEMP_FILE)) {
      await showToast({ style: Toast.Style.Failure, title: "No files to paste" });
      return;
    }

    const filePaths = JSON.parse(fs.readFileSync(TEMP_FILE, "utf-8"));
    if (filePaths.length === 0) {
      await showToast({ style: Toast.Style.Failure, title: "No files to paste" });
      return;
    }

    const frontmostApp = await getFrontmostApplication();
    if (frontmostApp.name !== "Finder") {
      await showToast({ style: Toast.Style.Failure, title: "Finder is not active" });
      return;
    }

    const targetPath = execSync(
      "osascript -e 'tell application \"Finder\" to get POSIX path of (target of window 1 as alias)'",
    )
      .toString()
      .trim();

    for (const filePath of filePaths) {
      const fileName = path.basename(filePath);
      let destination = path.join(targetPath, fileName);

      let counter = 1;
      while (fs.existsSync(destination)) {
        const ext = path.extname(fileName);
        const base = path.basename(fileName, ext);
        const newFileName = `${base} (${counter})${ext}`;
        destination = path.join(targetPath, newFileName);
        counter++;
      }

      fs.renameSync(filePath, destination);
    }

    fs.unlinkSync(TEMP_FILE);

    await showHUD(`Pasted ${filePaths.length} file${filePaths.length > 1 ? "s" : ""}`);
  } catch (error) {
    await showToast({ style: Toast.Style.Failure, title: "Failed to paste files", message: String(error) });
  }
}
