import { getPreferenceValues, showHUD, closeMainWindow } from "@raycast/api";
import { backups, initializeFirebaseApp } from "firestore-export-import";
import { IExportOptions } from "firestore-export-import/dist/helper";
import dayjs from "dayjs";
import { convertStringToNumber, readFile, writeFile } from "./utils";
import { Preferences } from "./interfaces";

const preferences = getPreferenceValues<Preferences>();

const exportOptions: IExportOptions = {
  docsFromEachCollection:
    preferences.limitDocumentExport?.length !== 0 ? convertStringToNumber(preferences.limitDocumentExport) : 0,
};

initializeFirebaseApp(JSON.parse(readFile(preferences.firebaseAuth)));

const collectionsList: Array<string> | undefined =
  preferences.collectionList?.length !== 0 ? preferences.collectionList.split(",") : undefined;

export default async function Command() {
  try {
    await closeMainWindow({ clearRootSearch: true });
    await backups(collectionsList, exportOptions).then((collections: any) => {
      if (preferences.fileByCollection) {
        Object.entries(collections).forEach((entry) => {
          const [collection, content] = entry;
          writeFile(
            JSON.stringify({ [collection]: content }, null, 4),
            preferences.exportFileStorage,
            collection + "_" + dayjs().format("YYYY-MM-DD_Hmm") + ".json"
          );
        });
      } else {
        writeFile(
          JSON.stringify(collections, null, 4),
          preferences.exportFileStorage,
          "backup" + "_" + dayjs().format("YYYY-MM-DD_Hmm") + ".json"
        );
      }
    });
    await showHUD("🤟 Backups are generated !! 🤟");
  } catch (err) {
    await showHUD("❌ Failed to export Firestore Collection(s) !");
  }
}
