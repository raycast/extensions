import { showToast, Toast, confirmAlert, getPreferenceValues } from "@raycast/api";
import { execSync } from "child_process";
import fs from "fs";
import os from "os";
import path from "path";

type Preferences = {
  folders: string;
  keywords: string;
  extensions: string;
  askBeforeDelete: boolean;
};

export default async function main() {
  const prefs = getPreferenceValues<Preferences>();
  const folders = prefs.folders.split(",").map((f) => f.trim().replace(/^~(?=$|\/)/, os.homedir()));
  const keywords = prefs.keywords.split(",").map((w) => w.trim().toLowerCase());
  const extensions = prefs.extensions.split(",").map((e) => e.trim().toLowerCase());

  const matchingFiles: string[] = [];

  for (const folder of folders) {
    if (!fs.existsSync(folder)) continue;

    const files = fs.readdirSync(folder);

    for (const file of files) {
      const fullPath = path.join(folder, file);
      const ext = path.extname(file).slice(1).toLowerCase();

      const matchesKeyword = keywords.some((kw) => file.toLowerCase().includes(kw));
      const matchesExt = extensions.includes(ext);

      if (matchesKeyword && matchesExt) {
        if (!fs.existsSync(fullPath)) continue;
        if (!path.isAbsolute(fullPath)) continue;

        matchingFiles.push(fullPath);
      }
    }
  }

  if (matchingFiles.length === 0) {
    await showToast({
      style: Toast.Style.Failure,
      title: "No Screenshots found",
    });
    return;
  }

  if (prefs.askBeforeDelete) {
    const confirm = await confirmAlert({
      title: "Confirm Deletion",
      message: `Delete ${matchingFiles.length} screenshot${matchingFiles.length > 1 ? "s" : ""}?`,
    });
    if (!confirm) return;
  }

  const fileList = matchingFiles.map((f) => `POSIX file "${f.replace(/"/g, '\\"')}"`).join(", ");

  execSync(`osascript -e 'tell application "Finder" to delete {${fileList}}'`);
  const deletedCount = matchingFiles.length;

  if (deletedCount > 0) {
    await showToast({
      style: Toast.Style.Success,
      title: `${deletedCount} Screenshot${deletedCount > 1 ? "s" : ""} deleted`,
    });
  }
}
