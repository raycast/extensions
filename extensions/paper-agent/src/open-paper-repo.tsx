import { getPreferenceValues, open, showToast, Toast } from "@raycast/api";
import * as fs from "node:fs";

export default async function Command() {
  const prefs = getPreferenceValues<Preferences.OpenPaperRepo>();
  const paperDir = prefs.paperDir?.trim() ?? "";

  if (!paperDir) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Paper directory required",
      message: "Set 'Paper Directory' in extension preferences.",
    });
    return;
  }

  if (!fs.existsSync(paperDir)) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Folder not found",
      message: paperDir,
    });
    return;
  }

  await open(paperDir);
  await showToast({
    style: Toast.Style.Success,
    title: "Opened paper directory",
    message: paperDir,
  });
}
