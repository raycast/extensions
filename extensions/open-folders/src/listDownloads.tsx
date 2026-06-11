import { getPreferenceValues, showToast, Toast } from "@raycast/api";
import { useEffect } from "react";
import { readFiles } from "./utils/read-directory";
import { FileList } from "./utils/file-list";

export default function Command() {
  const prefs = getPreferenceValues<Preferences.ListDownloads>();
  const { entries, error } = readFiles(prefs.downloadedFilesdir);

  useEffect(() => {
    if (error) {
      showToast({ style: Toast.Style.Failure, title: "Cannot read directory", message: error });
    }
  }, [error]);

  return <FileList items={entries} layout={prefs.layout} />;
}
