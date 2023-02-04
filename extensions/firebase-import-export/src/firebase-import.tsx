import { getPreferenceValues, showHUD, closeMainWindow, getSelectedFinderItems, confirmAlert } from "@raycast/api";
import { initializeFirebaseApp, restore } from "firestore-export-import";
import { IImportOptions } from "firestore-export-import/dist/helper";
import { Preferences } from "./interfaces";

/* A constant that is used to display debug messages in the console. */
const __DEBUG = true;
/* Getting the preferences from the Raycast API. */
const preferences = getPreferenceValues<Preferences>();
/* Importing the service account from the preferences. */
/* tslint:disable no-var-requires */
const serviceAccount = require(preferences.firebaseAuth);

/* Setting the export options. */
const importOptions: IImportOptions = {
  autoParseDates: true,
  autoParseGeos: true,
  showLogs: __DEBUG,
};

/* Initializing the Firebase app with the service account. */
initializeFirebaseApp(serviceAccount);

export default async function Command() {
  try {
    const fileSystemItems = await getSelectedFinderItems();
    if (
      await confirmAlert({ title: "🚨 Are you sure to restore ? It will override or add new data to the collection" })
    ) {
      /* It closes the main window of the Raycast application. */
      await closeMainWindow({ clearRootSearch: true });
      /* Exporting the data from the Firestore database. */
      __DEBUG && console.log("Files List: " + JSON.stringify(fileSystemItems));
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
