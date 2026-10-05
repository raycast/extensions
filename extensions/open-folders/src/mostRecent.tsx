import { open, getPreferenceValues, showToast, Toast } from "@raycast/api";
import { readFiles } from "./utils/read-directory";

export default async function Command() {
  const dir = getPreferenceValues<Preferences.MostRecent>().downloadsdir;
  const { entries, error } = readFiles(dir);

  if (error) {
    await showToast({ style: Toast.Style.Failure, title: "Cannot read directory", message: error });
    return;
  }

  if (entries.length === 0) {
    await showToast({ style: Toast.Style.Failure, title: "No files found", message: dir });
    return;
  }

  await open(entries[0].fullPath);
}
