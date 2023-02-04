import { getPreferenceValues, showHUD, closeMainWindow, getSelectedFinderItems, confirmAlert } from "@raycast/api";
import { initializeFirebaseApp, restore } from "firestore-export-import";
import { IImportOptions } from "firestore-export-import/dist/helper";
import { Preferences } from "./interfaces";
import { readFile } from "./utils";

/* Getting the preferences from the Raycast API. */
const preferences = getPreferenceValues<Preferences>();

/* Setting the export options. */
const importOptions: IImportOptions = {
  autoParseDates: true,
  autoParseGeos: true,
  showLogs: false,
};

/* Initializing the Firebase app with the service account. */
initializeFirebaseApp(JSON.parse(readFile(preferences.firebaseAuth)));

export default async function Command() {
  try {
    const fileSystemItems = await getSelectedFinderItems();
    if (
      await confirmAlert({ title: "🚨 Are you sure to restore ? It will override or add new data to the collection" })
    ) {
      /* It closes the main window of the Raycast application. */
      await closeMainWindow({ clearRootSearch: true });
      /* Exporting the data from the Firestore database. */
      await Promise.all(
        fileSystemItems.map(async (file) => {
          await restore(file.path, importOptions);
        })
      );
      /* It shows a message in the HUD (Heads Up Display) of the Raycast application. */
      await showHUD("🤟 Collection imported with success !! 🤟");
    }
  } catch (err) {
    /* Showing a message in the HUD (Heads Up Display) of the Raycast application. */
    await showHUD("❌ Failed to import Firestore Collection(s) !");
  }
}
