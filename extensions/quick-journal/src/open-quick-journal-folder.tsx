import { showToast, ToastStyle, popToRoot, getPreferenceValues } from "@raycast/api";
import { exec } from "child_process";
import path from "path";
import fs from "fs";

interface Preferences {
  journalFolderPath: string;
}

const preferences = getPreferenceValues<Preferences>();
const homeDirectory = process.env.HOME || "/";
const journalPath = preferences.journalFolderPath || path.join(homeDirectory, "Documents", "Quick Journal");

export default function OpenJournalFolder() {
  fs.mkdir(journalPath, { recursive: true }, (err) => {
    if (err) {
      showToast(ToastStyle.Failure, "Failed to create folder", err.message);
      return;
    }

    exec(`open "${journalPath}"`, async (error) => {
      if (error) {
        showToast(ToastStyle.Failure, "Failed to open folder", error.message);
      } else {
        await popToRoot();
      }
    });
  });
}
