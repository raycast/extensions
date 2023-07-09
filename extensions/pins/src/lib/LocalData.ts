import { Application, getFrontmostApplication, getPreferenceValues } from "@raycast/api";
import { useEffect, useState } from "react";
import { SupportedBrowsers, getCurrentTabs, getCurrentURL } from "./browser-utils";
import { useCachedState } from "@raycast/utils";
import { runAppleScript } from "run-applescript";
import { ExtensionPreferences, getStorage, runCommand, setStorage } from "./utils";
import { StorageKey } from "./constants";

/**
 * Local data object that stores various contextual information for use in placeholders, recent apps list, etc.
 */
interface LocalDataObject {
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
    currentDocument: { name: "", path: "" },
  };
};

/**
 * Gets the current Finder directory.
 * @returns A promise resolving to the path of the current directory as a string.
 */
const getCurrentDirectory = async (): Promise<{ name: string; path: string }> => {
  const data = await runAppleScript(`tell application "Finder"
    set oldDelims to AppleScript's text item delimiters
    set AppleScript's text item delimiters to "\`\`\`"
    set theData to {name, POSIX path} of (insertion location as alias)
    set theData to theData as string
    set AppleScript's text item delimiters to oldDelims
    return theData
  end tell`);
  const entries = data.split("```");
  if (entries.length == 2) {
    return { name: entries[0], path: entries[1] };
  }
  return { name: "", path: "" };
};

/**
 * Gets the selected Finder items.
 * @returns A promise resolving to an array of objects containing the name and path of each selected item.
 */
export const getFinderSelection = async (): Promise<{ name: string; path: string }[]> => {
  const data = await runAppleScript(
    `tell application "Finder"
    set theSelection to selection
    set thePath to {}
    repeat with i in theSelection
      set end of thePath to {name, POSIX path} of (i as alias)
    end repeat
    return thePath
  end tell`,
    { humanReadableOutput: true }
  );

  const entries = data.split(", ");
  const names = entries.filter((entry, index) => index % 2 == 0);
  const paths = entries.filter((entry, index) => index % 2 == 1);
  return names.map((name, index) => ({ name: name, path: paths[index] }));
};

/**
 * Gets the names and IDs of the selected notes in Notes.app.
 * @returns A promise resolving to an array of objects containing the name and ID of each selected note.
 */
const getSelectedNotes = async (): Promise<{ name: string; id: string }[]> => {
  const selection = await runCommand(
    `osascript -e 'Application("Notes").running() ? Application("Notes").selection().map((note) => ({ name: note.name(), id: note.id() })) : []' -l "JavaScript" -s s`
  );
  return JSON.parse(selection);
};

/**
 * Gets the name and path of the active TextEdit document.
 * @returns A promise resolving to an object containing the document's name and path. If no document is open, the name and path will be empty strings.
 */
const getActiveTextEditDocument = async (): Promise<{ name: string; path: string }> => {
  const data = await runAppleScript(`try
    tell application "TextEdit"
      set oldDelims to AppleScript's text item delimiters
      set AppleScript's text item delimiters to "\`\`\`"
      set theData to {name, path} of document 1
      set theData to theData as string
      set AppleScript's text item delimiters to oldDelims
      return theData
    end tell
  end try`);
  const entries = data.split("```");
  if (entries.length == 2) {
    return { name: entries[0], path: entries[1] };
  }
  return { name: "", path: "" };
};

/**
 * Gets the name and path of the active document in iWork apps (Pages, Numbers, Keynote).
 * @param appName The name of the iWork app to get the active document from.
 * @returns A promise resolving to an object containing the document's name and path. If no document is open, the name and path will be empty strings.
 */
const getActiveiWorkDocument = async (appName: string): Promise<{ name: string; path: string }> => {
  const data = await runAppleScript(`try
      tell application "${appName}"
        set oldDelims to AppleScript's text item delimiters
        set AppleScript's text item delimiters to "\`\`\`"
        set {theName, theFile} to {name, file} of document 1
        if theFile is not missing value then
          set theData to {theName, POSIX path of theFile}
          set theData to theData as string
          set AppleScript's text item delimiters to oldDelims
          return theData
        end if
      end tell
    end try`);
  const entries = data.split("```");
  if (entries.length == 2) {
    return { name: entries[0], path: entries[1] };
  }
  return { name: "", path: "" };
};

/**
 * Gets the name and path of the active document in Microsoft Word.
 * @returns A promise resolving to an object containing the document's name and path. If no document is open, the name and path will be empty strings.
 */
const getActiveWordDocument = async (): Promise<{ name: string; path: string }> => {
  const data = await runAppleScript(`try
      tell application "Microsoft Word"
        set oldDelims to AppleScript's text item delimiters
        set AppleScript's text item delimiters to "\`\`\`"
        set {theName, theFile} to {name, path} of document 1
        if theFile is not missing value then
          set theData to {theName, POSIX path of (theFile as alias) & theName}
          set theData to theData as string
          set AppleScript's text item delimiters to oldDelims
          return theData
        end if
      end tell
    end try`);
  const entries = data.split("```");
  if (entries.length == 2) {
    return { name: entries[0], path: entries[1] };
  }
  return { name: "", path: "" };
};

/**
 * Gets the name and path of the active document in Microsoft PowerPoint.
 * @returns A promise resolving to an object containing the document's name and path. If no document is open, the name and path will be empty strings.
 */
const getActivePowerPointDocument = async (): Promise<{ name: string; path: string }> => {
  const data = await runAppleScript(`try
      tell application "Microsoft PowerPoint"
        set oldDelims to AppleScript's text item delimiters
        set AppleScript's text item delimiters to "\`\`\`"
        set {theName, theFile} to {name, path} of presentation 1
        if theFile is not missing value then
          set theData to {theName, theFile & "/" & theName}
          set theData to theData as string
          set AppleScript's text item delimiters to oldDelims
          return theData
        end if
      end tell
    end try`);
  const entries = data.split("```");
  if (entries.length == 2) {
    return { name: entries[0], path: entries[1] };
  }
  return { name: "", path: "" };
};

/**
 * Gets the name and path of the active document in Microsoft Excel.
 * @returns A promise resolving to an object containing the document's name and path. If no document is open, the name and path will be empty strings.
 */
const getActiveExcelDocument = async (): Promise<{ name: string; path: string }> => {
  const data = await runAppleScript(`try
      tell application "Microsoft Excel"
        set oldDelims to AppleScript's text item delimiters
        set AppleScript's text item delimiters to "\`\`\`"
        set {theName, theFile} to {name, path} of workbook 1
        if theFile is not missing value then
          set theData to {theName, theFile & "/" & theName}
          set theData to theData as string
          set AppleScript's text item delimiters to oldDelims
          return theData
        end if
      end tell
    end try`);
  const entries = data.split("```");
  if (entries.length == 2) {
    return { name: entries[0], path: entries[1] };
  }
  return { name: "", path: "" };
};

/**
 * Gets the name and path of the active document in generic document-based apps.
 * @param appName The name of the app to get the active document from.
 * @returns A promise resolving to an object containing the document's name and path. If no document is open, the name and path will be empty strings.
 */
const getActiveDocument = async (appName: string): Promise<{ name: string; path: string }> => {
  const data = await runAppleScript(`try
      tell application "${appName}"
        set oldDelims to AppleScript's text item delimiters
        set AppleScript's text item delimiters to "\`\`\`"
        set {theName, theFile} to {name, path} of document 1
        if theFile is not missing value then
          set theData to {theName, theFile}
          set theData to theData as string
          set AppleScript's text item delimiters to oldDelims
          return theData
        end if
      end tell
    end try`);
  const entries = data.split("```");
  if (entries.length == 2) {
    return { name: entries[0], path: entries[1] };
  }
  return { name: "", path: "" };
};

/**
 * Tracks recently used applications (if enabled in the extension's settings).
 */
export const updateRecentApplications = async () => {
  try {
    const app = await getFrontmostApplication();
    const recentApps = await getStorage(StorageKey.RECENT_APPS);
    const newRecentApps = recentApps.filter(
      (recentApp: Application) => recentApp.name != app.name && recentApp.name != "Raycast"
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

      if (app.name == "Finder") {
        newData.currentDirectory = await getCurrentDirectory();
        newData.selectedFiles = await getFinderSelection();
      } else if (SupportedBrowsers.includes(app.name)) {
        newData.tabs = await getCurrentTabs(app.name);
        newData.currentTab = await getCurrentURL(app.name);
      } else if (app.name == "Notes") {
        newData.selectedNotes = await getSelectedNotes();
      } else if (app.name == "TextEdit") {
        newData.currentDocument = await getActiveTextEditDocument();
      } else if (app.name == "Pages") {
        newData.currentDocument = await getActiveiWorkDocument("Pages");
      } else if (app.name == "Numbers") {
        newData.currentDocument = await getActiveiWorkDocument("Numbers");
      } else if (app.name == "Keynote") {
        newData.currentDocument = await getActiveiWorkDocument("Keynote");
      } else if (app.name == "Microsoft Word") {
        newData.currentDocument = await getActiveWordDocument();
      } else if (app.name == "Microsoft Excel") {
        newData.currentDocument = await getActiveExcelDocument();
      } else if (app.name == "Microsoft PowerPoint") {
        newData.currentDocument = await getActivePowerPointDocument();
      } else if (app.name == "Script Editor") {
        newData.currentDocument = await getActiveDocument("Script Editor");
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
