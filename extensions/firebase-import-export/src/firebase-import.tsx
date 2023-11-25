import { getPreferenceValues, showHUD, closeMainWindow, getSelectedFinderItems, confirmAlert } from "@raycast/api";
import { initializeFirebaseApp, restore } from "firestore-export-import";
import { IImportOptions } from "firestore-export-import/dist/helper";
import { Preferences } from "./interfaces";
import { readFile } from "./utils";

const preferences = getPreferenceValues<Preferences>();

const importOptions: IImportOptions = {
  autoParseDates: true,
  autoParseGeos: true,
  showLogs: false,
};

initializeFirebaseApp(JSON.parse(readFile(preferences.firebaseAuth)));

export default async function Command() {
  try {
    const fileSystemItems = await getSelectedFinderItems().catch((error) => {
      throw new Error("You need to select in Finder, one or more files to import");
    });
    if (
      await confirmAlert({
        icon: "🚨",
        title:
          "Are you sure you want to restore these collections? This will override or add new data to the current collections",
      })
    ) {
      await closeMainWindow({ clearRootSearch: true });
      await Promise.all(
        fileSystemItems.map(async (file) => {
          await restore(file.path, importOptions);
        })
      );
      await showHUD("🤟 Collection imported with success !! 🤟");
    }
  } catch (err) {
    await showHUD("❌ Failed to import Firestore Collection(s). " + err + " !");
  }
}
