/**
 * @module lib/LocalData.ts A collection of functions for getting contextual information about the user's system. This includes the frontmost application, the current Finder directory, the selected Finder items, the selected text, the current document in document-based apps, etc.
 *
 * @summary Local data and context utilities.
 * @author Stephen Kaplan <skaplanofficial@gmail.com>
 *
 * Created at     : 2023-09-04 17:36:31
 * Last modified  : 2023-11-01 00:43:57
 */

import { Application, getFrontmostApplication, getPreferenceValues, getSelectedText } from "@raycast/api";
import { useEffect, useState } from "react";
import { SupportedBrowsers, getCurrentTabs, getCurrentURL } from "./browser-utils";
import { runAppleScript, useCachedState } from "@raycast/utils";
import { getStorage, setStorage } from "./utils";
import { ExtensionPreferences } from "./preferences";
import { StorageKey } from "./constants";

/**
 * Local data object that stores various contextual information for use in placeholders, recent apps list, etc.
 */
export interface LocalDataObject {
  /**
   * The current frontmost application. The application is represented as an object with a name, path, and bundle ID.
   */
  currentApplication: { name: string; path: string; bundleId: string };

  /**
   * The list of the last 10 most recently used applications. Applications are represented as objects with a name, path, and bundle ID.
   */
  recentApplications: Application[];

  /**
   * The list of currently open tabs in the frontmost browser. The browser must be a member of {@link SupportedBrowsers}. Tabs are represented as objects with a name and URL.
   */
  tabs: { name: string; url: string }[];

  /**
   * The name and URL of the currently active tab in the frontmost browser. The browser must be a member of {@link SupportedBrowsers}.
   */
  currentTab: { name: string; url: string };

  /**
   * The name and path of the current Finder directory.
   */
  currentDirectory: { name: string; path: string };

  /**
   * The list of currently selected files in Finder. Files are represented as objects with a name and path.
   */
  selectedFiles: { name: string; path: string }[];

  /**
   * The list of currently selected notes in Notes. Notes are represented as objects with a name and ID. The ID is the AppleScript ID of the note (not the ID used by the notes:// URL scheme).
   */
  selectedNotes: { name: string; id: string }[];

  /**
   * The currently selected text in the frontmost application.
   */
  selectedText: string;

  /**
   * The name and path of the current document in the frontmost application. The application must be a document-based application such as iWork apps, Office apps, etc.
   */
  currentDocument: { name: string; path: string };
}

/**
 * A placeholder for the local data object to be populated by the {@link useLocalData} hook.
 * @returns An empty {@link LocalDataObject}.
 */
const dummyData = (): LocalDataObject => {
  return {
    currentApplication: { name: "", path: "", bundleId: "" },
    recentApplications: [],
    tabs: [] as { name: string; url: string }[],
    currentTab: { name: "", url: "" },
    currentDirectory: { name: "", path: "" },
    selectedFiles: [] as { name: string; path: string }[],
    selectedNotes: [] as { name: string; id: string }[],
    selectedText: "",
    currentDocument: { name: "", path: "" },
  };
};

/**
 * Gets various contextual information about the user's active applications.
 * @returns A promise resolving to an object containing the current Finder directory, the selected Finder items, the selected notes, and the current document in document-based apps.
 */
export const requestLocalData = async (): Promise<{
  currentDirectory: { name: string; path: string } | null;
  finderSelection: { name: string; path: string }[];
  selectedNotes: { name: string; id: string }[];
  activeDocument: { name: string; path: string } | null;
}> => {
  const data = await runAppleScript(
    `function run() {
    let data = {
      currentDirectory: null,
      finderSelection: [],
      selectedNotes: [],
      activeDocument: null,
    };
    
    const se = Application("System Events");
    const frontApp = se.applicationProcesses.whose({ frontmost: true }).name();
        
    try {
      if (frontApp == "Finder") {
        const finder = Application("Finder");
			  const currentDirectory = finder.insertionLocation();
			  data.currentDirectory = { name: currentDirectory.name(), path: $.NSURL.alloc.initWithString(currentDirectory.url()).path.js };
		
			  let theSelection = finder.selection();
        data.finderSelection = theSelection.map((item) => {
          const itemPath = $.NSURL.alloc.initWithString(item.url()).path.js
          return { name: item.name(), path: itemPath }
        });
      } else if (frontApp == "Notes") {
        data.selectedNotes = Application("Notes").selection().map((note) => ({ name: note.name(), id: note.id() }));
      } else if (frontApp == "TextEdit") {
        const textedit = Application("TextEdit");
        const doc = textedit.documents[0];
        data.activeDocument = { name: doc.name(), path: doc.path() };
      } else if (frontApp == "Pages" || frontApp == "Numbers" || frontApp == "Keynote") {
        const iworkApp = Application(frontApp.toString());
        const doc = iworkApp.documents[0];
        data.activeDocument = { name: doc.name(), path: doc.file().toString() };
      } else if (frontApp == "Microsoft Word") {
        const word = Application("Microsoft Word");
        const doc = word.activeDocument;
        data.activeDocument = { name: doc.name(), path: \`\${se.aliases[doc.path()].posixPath()}/\${doc.name()}\` };
      } else if (frontApp == "Microsoft PowerPoint") {
        const powerpoint = Application("Microsoft PowerPoint");
        const doc = powerpoint.activePresentation;
        data.activeDocument = { name: doc.name(), path: \`\${se.aliases[doc.path()].posixPath()}/\${doc.name()}\` };
      } else if (frontApp == "Microsoft Excel") {
        const excel = Application("Microsoft Excel");
        const doc = excel.activeWorkbook;
        data.activeDocument = { name: doc.name(), path: \`\${se.aliases[doc.path()].posixPath()}/\${doc.name()}\` };
      } else {
        // Try to get active document from any generic document-based app
        const app = Application(frontApp.toString());
        const doc = app.documents[0];
        data.activeDocument = { name: doc.name(), path: doc.path().toString() };
      }
    } catch (e) {
      console.log(e);
    }
    
    return data;
  }`,
    { language: "JavaScript", humanReadableOutput: false },
  );
  return JSON.parse(data);
};

/**
 * Gets the selected Finder items.
 * @returns A promise resolving to an array of objects containing the name and path of each selected item.
 */
export const getFinderSelection = async (): Promise<{ name: string; path: string }[]> => {
  const data = await runAppleScript(
    `try
    tell application "Finder"
      set theSelection to selection
      set thePath to {}
      repeat with i in theSelection
        set end of thePath to {name, POSIX path} of (i as alias)
      end repeat
      return thePath
    end tell
  end try`,
    { humanReadableOutput: true },
  );

  const entries = data.split(", ");
  const names = entries.filter((entry, index) => index % 2 == 0);
  const paths = entries.filter((entry, index) => index % 2 == 1);
  return names.map((name, index) => ({ name: name, path: paths[index] }));
};

/**
 * Tracks recently used applications (if enabled in the extension's settings).
 */
export const updateRecentApplications = async () => {
  try {
    const app = await getFrontmostApplication();
    const recentApps = await getStorage(StorageKey.RECENT_APPS);
    const newRecentApps = recentApps.filter(
      (recentApp: Application) => recentApp.name != app.name && recentApp.name != "Raycast",
    );

    if (app.name != "Raycast") {
      newRecentApps.unshift(app);
    }
    while (newRecentApps.length > 10) {
      newRecentApps.pop();
    }
    await setStorage(StorageKey.RECENT_APPS, newRecentApps);
  } catch (error) {
    console.error(error);
  }
};

/**
 * Gets the list of recently used applications.
 * @returns A promise resolving to an array of recently used applications as Application objects (name, path, bundleId).
 */
export const getRecentApplications = async (): Promise<Application[]> => {
  await updateRecentApplications();
  const recentApps = await getStorage(StorageKey.RECENT_APPS);
  return recentApps;
};

/**
 * Hook to get the list of recently used applications.
 * @returns An object containing the list of recently used applications and a boolean indicating whether the list is still loading.
 */
export const useRecentApplications = () => {
  const [recentApplications, setRecentApplications] = useState<Application[]>([]);
  const [loadingRecentApplications, setLoadingRecentApplications] = useState(true);

  const preferences = getPreferenceValues<ExtensionPreferences>();

  useEffect(() => {
    if (preferences.showRecentApplications) {
      getRecentApplications().then((newRecentApplications) => {
        setRecentApplications(newRecentApplications);
        setLoadingRecentApplications(false);
      });
    } else {
      setLoadingRecentApplications(false);
    }
  }, []);

  return { recentApplications: recentApplications, loadingRecentApplications: loadingRecentApplications };
};

/**
 * Gets the selected text in the frontmost application. Avoids sounding the 'alert' sound by muting the system volume, then restoring it after getting the text.
 * @returns A promise resolving to the selected text string.
 */
export const getTextSelection = async (): Promise<string> => {
  const oldVolume = await runAppleScript(`set oldVolume to output volume of (get volume settings)
    set volume output volume 0
    return oldVolume`);
  let text = "";
  try {
    text = await getSelectedText();
  } catch (error) {
    console.error(error);
  }
  runAppleScript(`set volume output volume ${oldVolume}`);
  return text;
};

/**
 * Hook to get the local data object, see {@link LocalDataObject}.
 * @returns An object containing the local data object and a boolean indicating whether the object is still loading.
 */
export const useLocalData = () => {
  const [localData, setLocalData] = useCachedState<LocalDataObject>("--local-data", dummyData());
  const [loadingLocalData, setLoadingLocalData] = useState(true);

  const preferences = getPreferenceValues<ExtensionPreferences & { showPinShortcut: boolean }>();

  useEffect(() => {
    const getLocalData = async () => {
      const newData = dummyData();
      newData.recentApplications = await getRecentApplications();

      if (!preferences.showPinShortcut) {
        // Skip costly operations if the user doesn't want the pin shortcut
        return { ...localData, recentApplications: newData.recentApplications };
      }

      const app = newData.recentApplications[0];
      newData.currentApplication = { name: app.name, path: app.path, bundleId: app.bundleId || "" };

      newData.selectedText = await getTextSelection();

      const request = await requestLocalData();
      newData.currentDirectory = request.currentDirectory || { name: "", path: "" };
      newData.selectedFiles = request.finderSelection;
      newData.selectedNotes = request.selectedNotes;
      newData.currentDocument = request.activeDocument || { name: "", path: "" };

      if (SupportedBrowsers.includes(app.name)) {
        newData.tabs = await getCurrentTabs(app.name);
        newData.currentTab = await getCurrentURL(app.name);
      }

      return newData;
    };

    getLocalData().then((newData) => {
      setLocalData(newData);
      setLoadingLocalData(false);
    });
  }, []);

  return { localData: localData, loadingLocalData: loadingLocalData };
};
