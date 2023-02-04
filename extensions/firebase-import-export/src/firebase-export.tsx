import { getPreferenceValues, showHUD, closeMainWindow } from "@raycast/api";
import { backups, initializeFirebaseApp } from "firestore-export-import";
import { IExportOptions } from 'firestore-export-import/dist/helper';
import moment from 'moment';
import { convertStringToNumber, writeFile } from "./utils";
import { Preferences } from "./interfaces";

/* A constant that is used to display debug messages in the console. */
const __DEBUG = true;
/* Getting the preferences from the Raycast API. */
const preferences = getPreferenceValues<Preferences>();
/* Importing the service account from the preferences. */
const serviceAccount = require(preferences.firebaseAuth);

/* Setting the export options. */
const exportOptions:IExportOptions = {
    docsFromEachCollection: preferences.limitDocumentExport?.length !== 0 ? convertStringToNumber(preferences.limitDocumentExport) : 0,
};

/* Initializing the Firebase app with the service account. */
initializeFirebaseApp(serviceAccount);

const collectionsList:Array<string>|undefined = preferences.collectionList?.length !== 0 ? preferences.collectionList.split(",") : undefined;

export default async function Command() {
    try {
        /* It closes the main window of the Raycast application. */
        await closeMainWindow({ clearRootSearch: true });
        /* Exporting the data from the Firestore database. */
        await backups(collectionsList, exportOptions).then((collections: any) => {
            if (preferences.fileByCollection) {
                Object.entries(collections).forEach(entry => {
                    const [collection, content] = entry;
                    writeFile(JSON.stringify({[collection]: content}, null, 4), preferences.exportFileStorage, collection+'_'+moment().format("YYYY-MM-DD_Hmm")+'.json');
                });
            } else {
                writeFile(JSON.stringify(collections, null, 4), preferences.exportFileStorage, 'backup.json')
            }
        });
        /* It shows a message in the HUD (Heads Up Display) of the Raycast application. */
        await showHUD("🤟 Backups are generated !! 🤟");
    } catch(err: any) {
        /* Showing a message in the HUD (Heads Up Display) of the Raycast application. */
        await showHUD(err.message)
    }   
}