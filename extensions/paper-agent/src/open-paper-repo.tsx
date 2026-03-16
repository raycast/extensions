import { getPreferenceValues, open, showToast, Toast } from "@raycast/api";
import * as fs from "node:fs";

const prefs = getPreferenceValues<Preferences.OpenPaperRepo>();
const PREF_PAPER_DIR = prefs.paperDir?.trim() ?? "";
const PAPER_DIR = PREF_PAPER_DIR;

export default async function Command() {
  if (!PAPER_DIR) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Paper directory required",
      message: "Set 'Paper directory' in extension preferences.",
    });
    return;
  }

  if (!fs.existsSync(PAPER_DIR)) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Folder not found",
      message: PAPER_DIR,
    });
    return;
  }

  await open(PAPER_DIR);
  await showToast({
    style: Toast.Style.Success,
    title: "Opened paper directory",
    message: PAPER_DIR,
  });
}
