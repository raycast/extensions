import { Toast, showToast } from "@raycast/api";
import { TODO_FILE_PATH, preferences } from "./services/config";
import { getSyncWithDirectory } from "./utils/utils";
import fs from "fs";

export default async function Command() {
  const filePath = preferences.fileLocation;
  try {
    const newNotes = await getSyncWithDirectory(filePath);
    fs.writeFileSync(TODO_FILE_PATH, JSON.stringify(newNotes, null, 2));
    await showToast({ style: Toast.Style.Success, title: "Notes Synced" });
  } catch (e) {
    if (typeof e === "string") {
      await showToast({ style: Toast.Style.Failure, title: e });
    }
  }
}
