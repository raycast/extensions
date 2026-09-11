import { getPreferenceValues, showToast, Toast } from "@raycast/api";
import { useEffect } from "react";
import { readFolders } from "./utils/read-directory";
import { FileList } from "./utils/file-list";

export default function Command() {
  const prefs = getPreferenceValues<Preferences.ListFolders>();
  const { entries, error } = readFolders(prefs.homedir);

  useEffect(() => {
    if (error) {
      showToast({ style: Toast.Style.Failure, title: "Cannot read directory", message: error });
    }
  }, [error]);

  return <FileList items={entries} layout={prefs.layout} showPins navigable />;
}
