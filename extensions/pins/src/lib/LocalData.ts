/**
 * @module lib/LocalData.ts A collection of functions for getting contextual information about the user's system. This includes the frontmost application, the current Finder directory, the selected Finder items, the selected text, the current document in document-based apps, etc.
 *
 * @summary Local data and context utilities.
 * @author Stephen Kaplan <skaplanofficial@gmail.com>
 *
 * Created at     : 2023-09-04 17:36:31
 * Last modified  : 2024-01-13 01:07:53
 */

import { Application, getFrontmostApplication, getPreferenceValues } from "@raycast/api";
import { useEffect, useState } from "react";
import { runAppleScript, useCachedState } from "@raycast/utils";
import { getStorage, setStorage } from "./storage";
import { ExtensionPreferences } from "./preferences";
import { StorageKey } from "./constants";
import { utils } from "placeholders-toolkit";

/**
 * A reference to a tab in a browser.
 */
export type TabRef = { name: string; url: string };

/**
 * A reference to a file.
 */
export type FileRef = { name: string; path: string };

/**
 * A reference to a note in Notes.
 */
export type NoteRef = { name: string; id: string };

/**
 * A reference to a track in Music, Spotify, or TV.
 */
export type TrackRef = { name: string; artist: string; album: string; uri: string };

/**
 * A reference to a playlist in Music.
 */
export type PlaylistRef = { name: string };

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
  tabs: TabRef[];

  /**
   * The name and URL of the currently active tab in the frontmost browser. The browser must be a member of {@link SupportedBrowsers}.
   */
  currentTab: TabRef;

  /**
   * The name and path of the current Finder directory.
   */
  currentDirectory: FileRef;

  /**
   * The list of currently selected files in Finder. Files are represented as objects with a name and path.
   */
  selectedFiles: FileRef[];

  /**
   * The list of currently selected notes in Notes. Notes are represented as objects with a name and ID. The ID is the AppleScript ID of the note (not the ID used by the notes:// URL scheme).
   */
  selectedNotes: NoteRef[];

  /**
   * The name and path of the current document in the frontmost application. The application must be a document-based application such as iWork apps, Office apps, etc.
   */
  currentDocument: FileRef;

  /**
   * The name, artist, album, and URI of the currently playing track in Music, Spotify, or TV.
   */
  currentTrack: TrackRef;
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
    currentTrack: { name: "", artist: "", album: "", uri: "" },
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
  currentTrack: { name: string; artist: string; album: string; uri: string } | null;
}> => {
  const data = await runAppleScript(
    `function run() {
    let data = {
      currentDirectory: null,
      finderSelection: [],
      selectedNotes: [],
      activeDocument: null,
      currentTrack: null,
    };
    
    const se = Application("System Events");
    se.includeStandardAdditions = true;
    let errorType = "generic";
    try {
      errorType = "frontApp";
      const frontApp = se.applicationProcesses.whose({ frontmost: true }).name();
          
      if (frontApp == "Finder") {
        errorType = "Finder";
        const finder = Application("Finder");
        const currentDirectory = finder.insertionLocation();
        data.currentDirectory = { name: currentDirectory.name(), path: $.NSURL.alloc.initWithString(currentDirectory.url()).path.js };
    
        let theSelection = finder.selection();
        data.finderSelection = theSelection.map((item) => {
          const itemPath = $.NSURL.alloc.initWithString(item.url()).path.js
          return { name: item.name(), path: itemPath }
        });
      } else if (frontApp == "Notes") {
        errorType = "Notes";
        data.selectedNotes = Application("Notes").selection().map((note) => ({ name: note.name(), id: note.id() }));
      } else if (frontApp == "TextEdit") {
        errorType = "TextEdit";
        const textedit = Application("TextEdit");
        const doc = textedit.documents[0];
        data.activeDocument = { name: doc.name(), path: doc.path() };
      } else if (frontApp == "Pages" || frontApp == "Numbers" || frontApp == "Keynote") {
        errorType = "iWork";
        const iworkApp = Application(frontApp.toString());
        const doc = iworkApp.documents[0];
        data.activeDocument = { name: doc.name(), path: doc.file().toString() };
      } else if (frontApp == "Microsoft Word") {
        errorType = "Word";
        const word = Application("Microsoft Word");
        const doc = word.activeDocument;
        data.activeDocument = { name: doc.name(), path: \`\${se.aliases[doc.path()].posixPath()}/\${doc.name()}\` };
      } else if (frontApp == "Microsoft PowerPoint") {
        errorType = "PowerPoint";
        const powerpoint = Application("Microsoft PowerPoint");
        const doc = powerpoint.activePresentation;
        data.activeDocument = { name: doc.name(), path: \`\${se.aliases[doc.path()].posixPath()}/\${doc.name()}\` };
      } else if (frontApp == "Microsoft Excel") {
        errorType = "Excel";
        const excel = Application("Microsoft Excel");
        const doc = excel.activeWorkbook;
        data.activeDocument = { name: doc.name(), path: \`\${se.aliases[doc.path()].posixPath()}/\${doc.name()}\` };
      } else if (frontApp == "Music") {
        errorType = "Music";
        const music = Application("Music");
        try {
          const track = music.currentTrack;
          data.currentTrack = { name: track.name(), artist: track.artist() || "", album: track.album() || "", uri: "" };
        } catch {
          errorType = "Music.currentTrack";
        }
      } else if (frontApp == "Spotify") {
        errorType = "Spotify";
        const spotify = Application("Spotify");
        try {
          const track = spotify.currentTrack;
          data.currentTrack = { name: track.name(), artist: track.artist() || "", album: track.album() || "", uri: track.spotifyUrl() || "" };
        } catch {
          errorType = "Spotify.currentTrack";
        }
      } else if (frontApp == "TV") {
        errorType = "TV";
        const tv = Application("TV");
        try {
          const track = tv.currentTrack;
          data.currentTrack = { name: track.name(), artist: track.director() || "", album: track.album() || "", uri: "" };
        } catch {
          errorType = "TV.currentTrack";
        }
      } else {
        errorType = "document";
        // Try to get active document from any generic document-based app
        const app = Application(frontApp.toString());
        const docs = app.documents;
        const doc = docs.length > 0 ? docs[0] : null;
        if (doc) {
          try {
            debug = "document.path";
            const path = doc.path();
            if (path) {
              data.activeDocument = { name: doc.name(), path: doc.path.toString() };
            }
          } catch {
            debug = "document.file";
            const file = doc.file();
            if (file) {
              data.activeDocument = { name: doc.name(), path: file.toString() };
            }
          }
        }
      }
    } catch (error) {
      console.log(\`\${error.toString()}\n\nError Type: LocalData.\${errorType}\`);
    }
    
    return data;
  }`,
    { language: "JavaScript", humanReadableOutput: false, timeout: 0 },
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
    { humanReadableOutput: true, timeout: 0 },
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
 * Hook to get the local data object, see {@link LocalDataObject}.
 * @returns An object containing the local data object and a boolean indicating whether the object is still loading.
 */
export const useLocalData = () => {
  const [localData, setLocalData] = useCachedState<LocalDataObject>("--local-data", dummyData());
  const [loadingLocalData, setLoadingLocalData] = useState(true);

  useEffect(() => {
    const getLocalData = async () => {
      const newData = dummyData();
      newData.recentApplications = await getRecentApplications();

      const app = newData.recentApplications[0];
      newData.currentApplication = { name: app.name, path: app.path, bundleId: app.bundleId || "" };

      const request = await requestLocalData();
      newData.currentDirectory = request.currentDirectory || { name: "", path: "" };
      newData.selectedFiles = request.finderSelection;
      newData.selectedNotes = request.selectedNotes;
      newData.currentDocument = request.activeDocument || { name: "", path: "" };
      newData.currentTrack = request.currentTrack || { name: "", artist: "", album: "", uri: "" };

      const browser = utils.SupportedBrowsers.find((b) => b.name == app.name);
      if (browser) {
        newData.tabs = await browser.tabs();
        newData.currentTab = await browser.currentTab();
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
