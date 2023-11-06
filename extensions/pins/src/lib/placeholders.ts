/**
 * @module lib/placeholders.ts Placeholders specification and utilities for applying/interacting with them.
 *
 * @summary Placeholder utilities.
 * @author Stephen Kaplan <skaplanofficial@gmail.com>
 *
 * Created at     : 2023-09-04 17:38:00
 * Last modified  : 2023-11-01 00:43:30
 */

/* eslint-disable @typescript-eslint/no-unused-vars */ // Disable since many placeholder functions have unused parameters that are kept for consistency.
import { AI, Toast, environment, getFrontmostApplication, showHUD, showToast } from "@raycast/api";
import { Clipboard } from "@raycast/api";
import { SupportedBrowsers, getCurrentURL, getTextOfWebpage } from "./browser-utils";
import * as fs from "fs";
import * as os from "os";
import * as crypto from "crypto";
import * as vm from "vm";
import { getStorage, setStorage } from "./utils";
import { SORT_FN, StorageKey, SORT_STRATEGY } from "./constants";
import { execSync } from "child_process";
import { Pin, getPinStatistics, getPreviousPin, sortPins } from "./Pins";
import { LocalDataObject, getFinderSelection } from "./LocalData";
import path from "path";
import { runAppleScript } from "@raycast/utils";
import { LocationManager } from "./scripts";
import { scheduleTargetEvaluation } from "./scheduled-execution";
import { Group } from "./Groups";

/**
 * A placeholder type that associates Regex patterns with functions that applies the placeholder to a string, rules that determine whether or not the placeholder should be replaced, and aliases that can be used to achieve the same result.
 */
type Placeholder = {
  [key: string]: {
    /**
     * The detailed name of the placeholder.
     */
    name: string;

    /**
     * The aliases for the placeholder. Any of these aliases can be used in place of the placeholder to achieve the same result.
     */
    aliases?: string[];

    /**
     * The rules that determine whether or not the placeholder should be replaced. If any of these rules return true, the placeholder will be replaced. If no rules are provided, the placeholder will always be replaced.
     */
    rules: ((str: string, context?: LocalDataObject) => Promise<boolean>)[];

    /**
     * The function that applies the placeholder to a string.
     * @param str The string to apply the placeholder to.
     * @returns The string with the placeholder applied.
     */
    apply: (str: string, context?: LocalDataObject) => Promise<string>;
  };
};

/**
 * Placeholder specification.
 */
const placeholders: Placeholder = {
  "{{delay (\\d+?)(s|ms|m|h)?:([\\s\\S]*?)(?=}})": {
    name: "Delay",
    rules: [],
    apply: async (str: string, context?: LocalDataObject) => {
      const match = str.match(/(?<=delay )(\d+?)(s|ms|m|h)?:([\s\S]*)(?=}})/);
      if (!match) return "";
      const delay = parseInt(match[1]);
      const unit = match[2] || "s";
      const content = match[3] || "";
      if (!content.length) return "";
      if (delay <= 0) return "";

      // Short delay, less than update interval -> just use setTimeout
      if (unit == "s" && delay < 30) {
        await new Promise((resolve) =>
          setTimeout(() => {
            applyToString(content, context);
            resolve(true);
          }, delay * 1000),
        );
      }

      // Long delay, more than update interval -> schedule execution to be run on update interval
      else {
        const delayInMinutes =
          unit == "s" ? delay / 60 : unit == "ms" ? delay / 1000 / 60 : unit == "m" ? delay : delay * 60;
        const dueDate = new Date(Date.now() + Math.round(delayInMinutes) * 60000);
        await scheduleTargetEvaluation(content, dueDate);
      }
      return "";
    },
  },

  /**
   * Directive to reset the value of a persistent variable to its initial value. If the variable does not exist, nothing will happen. The placeholder will always be replaced with an empty string.
   */
  "{{reset [a-zA-Z0-9_]+}}": {
    name: "Reset Persistent Variable",
    rules: [],
    apply: async (str: string, context?: LocalDataObject) => {
      const matches = str.match(/{{reset ([a-zA-Z0-9_]+)}}/);
      if (matches) {
        const key = matches[1];
        const initialValue = await resetPersistentVariable(key);
        await setPersistentVariable(key, initialValue);
      }
      return "";
    },
  },

  /**
   * Directive to get the value of a persistent variable. If the variable does not exist, the placeholder will be replaced with an empty string.
   */
  "{{get [a-zA-Z0-9_]+}}": {
    name: "Get Persistent Variable",
    rules: [],
    apply: async (str: string, context?: LocalDataObject) => {
      const matches = str.match(/{{get ([a-zA-Z0-9_]+)}}/);
      if (matches) {
        const key = matches[1];
        return (await getPersistentVariable(key)) || "";
      }
      return "";
    },
  },

  /**
   * Directive to delete a persistent variable. If the variable does not exist, nothing will happen. The placeholder will always be replaced with an empty string.
   */
  "{{delete [a-zA-Z0-9_]+}}": {
    name: "Delete Persistent Variable",
    rules: [],
    apply: async (str: string, context?: LocalDataObject) => {
      const matches = str.match(/{{delete ([a-zA-Z0-9_]+)}}/);
      if (matches) {
        const key = matches[1];
        await deletePersistentVariable(key);
      }
      return "";
    },
  },

  /**
   * Directive/placeholder to ask the user for input via a dialog window. The placeholder will be replaced with the user's input. If the user cancels the dialog, the placeholder will be replaced with an empty string.
   */
  "{{input( prompt=(\"|').*?(\"|'))?}}": {
    name: "Input",
    rules: [],
    apply: async (str: string, context?: LocalDataObject) => {
      const pinsIcon = path.join(environment.assetsPath, "pins.icns");
      const prompt = str.match(/(?<=prompt=("|')).*?(?=("|'))/)?.[0] || "Input:";
      return (
        await runAppleScript(`try
          return text returned of (display dialog "${prompt}" default answer "" giving up after 60 with title "Input" with icon (POSIX file "${pinsIcon}"))
        on error
          return ""
        end try`)
      ).replaceAll(/({{|}})/g, "");
    },
  },

  /**
   * Directive/placeholder to execute a Siri Shortcut by name, optionally supplying input, and insert the result. If the result is null, the placeholder will be replaced with an empty string.
   */
  "{{shortcut:([\\s\\S]+?)( input=(\"|').*?(\"|'))?}}": {
    name: "Run Siri Shortcut",
    rules: [],
    apply: async (str: string, context?: LocalDataObject) => {
      const matches = str.match(/{{shortcut:([\s\S]+?)( input=("|')(.*?)("|'))?}}/);
      if (matches) {
        const shortcutName = matches[1];
        const input = matches[4] || "";
        const result = await runAppleScript(`tell application "Shortcuts Events"
          try
            set res to run shortcut "${shortcutName}" with input "${input}"
            if res is not missing value then
              return res
            else
              return ""
            end if 
          end try
        end tell`);
        return result.replaceAll(/({{|}})/g, "");
      }
      return "";
    },
  },

  /**
   * Placeholder for the text currently stored in the clipboard. If the clipboard is empty, this placeholder will not be replaced. Most clipboard content supplies a string format, such as file names when copying files in Finder.
   */
  "{{clipboardText}}": {
    name: "Clipboard Text",
    aliases: ["{{clipboard}}"],
    rules: [
      async (str: string, context?: LocalDataObject) => {
        try {
          return (await Clipboard.readText()) !== "";
        } catch (e) {
          return false;
        }
      },
    ],
    apply: async (str: string, context?: LocalDataObject) => {
      try {
        return (await Clipboard.readText())?.replaceAll(/({{|}})/g, "") || "";
      } catch (e) {
        return "";
      }
    },
  },

  /**
   * Placeholder for the currently selected text. If no text is selected, this placeholder will not be replaced.
   */
  "{{selectedText}}": {
    name: "Selected Text",
    rules: [
      async (str: string, context?: LocalDataObject) => {
        try {
          const text = context?.selectedText || "";
          return text !== "";
        } catch (e) {
          return false;
        }
      },
    ],
    apply: async (str: string, context?: LocalDataObject) => {
      try {
        return context?.selectedText?.replaceAll(/({{|}})/g, "") || "";
      } catch (e) {
        return "";
      }
    },
  },

  /**
   * Placeholder for the paths of the currently selected files in Finder as a comma-separated list. If no files are selected, this placeholder will not be replaced.
   */
  "{{selectedFiles}}": {
    name: "Selected Files",
    aliases: ["{{selectedFile}}"],
    rules: [
      async (str: string, context?: LocalDataObject) => {
        try {
          return (await getFinderSelection()).length > 0;
        } catch (e) {
          return false;
        }
      },
    ],
    apply: async (str: string, context?: LocalDataObject) => {
      try {
        return (await getFinderSelection()).map((file) => file.path).join(", ");
      } catch (e) {
        return "";
      }
    },
  },

  /**
   * Placeholder for the contents of the currently selected files in Finder as a newline-separated list. If no files are selected, this placeholder will not be replaced.
   */
  "{{selectedFileContents}}": {
    name: "Selected File Contents",
    aliases: [
      "{{selectedFilesContents}}",
      "{{selectedFileContent}}",
      "{{selectedFilesContent}}",
      "{{selectedFileText}}",
      "{{selectedFilesText}}",
      "{{contents}}",
    ],
    rules: [
      async (str: string, context?: LocalDataObject) => {
        try {
          return (await getFinderSelection()).length > 0;
        } catch (e) {
          return false;
        }
      },
    ],
    apply: async (str: string, context?: LocalDataObject) => {
      try {
        const files = await getFinderSelection();
        const fileContents = files.map((file) => fs.readFileSync(file.path));
        return fileContents.join("\n\n").replaceAll(/({{|}})/g, "");
      } catch (e) {
        return "";
      }
    },
  },

  /**
   * Placeholder for the name of the current application. Barring any issues, this should always be replaced.
   */
  "{{currentAppName}}": {
    name: "Current Application",
    aliases: ["{{currentApp}}", "{{currentApplication}}", "{{currentApplicationName}}"],
    rules: [],
    apply: async (str: string, context?: LocalDataObject) => {
      try {
        return (await getFrontmostApplication()).name || "";
      } catch (e) {
        return "";
      }
    },
  },

  /**
   * Placeholder for the path of the current application. Barring any issues, this should always be replaced.
   */
  "{{currentAppPath}}": {
    name: "Current Application Path",
    aliases: ["{{currentApplicationPath}}"],
    rules: [],
    apply: async (str: string, context?: LocalDataObject) => {
      try {
        return (await getFrontmostApplication()).path || "";
      } catch (e) {
        return "";
      }
    },
  },

  /**
   * Placeholder for the bundle ID of the current application. Barring any issues, this should always be replaced.
   */
  "{{currentAppBundleID}}": {
    name: "Current Application Bundle ID",
    aliases: ["{{currentAppBundle}}", "{{currentAppID}}", "{{currentApplicationID}}"],
    rules: [],
    apply: async (str: string, context?: LocalDataObject) => {
      try {
        return (await getFrontmostApplication()).bundleId || "";
      } catch (e) {
        return "";
      }
    },
  },

  /**
   * Placeholder for the list of names of all non-background applications currently running. The list is newline-separated by default, but can be changed with the `delim` argument.
   *
   * Syntax: `{{runningApplications delim="[string]"}}`
   */
  '{{runningApplications( (delim|delimiter|delimiters|delims)="(([^{]|{(?!{)|{{[\\s\\S]*?}})*?)")?}}': {
    name: "Running Applications",
    aliases: ["{{runningApps}}"],
    rules: [],
    apply: async (str: string, context?: LocalDataObject) => {
      const matches = str.match(/(?<=(delim|delimiter|delimiters|delims)=("|')).*?(?=("|'))/);
      const delim = matches ? matches[0] : "\n";
      try {
        const runningApps =
          (await runAppleScript(`tell application "System Events"
          set oldDelims to AppleScript's text item delimiters
          set AppleScript's text item delimiters to "###"
          set theApps to (name of every application process whose background only is false) as string
          set AppleScript's text item delimiters to oldDelims
          return theApps
        end tell`)) || "";
        return runningApps.split("###").join(delim);
      } catch (e) {
        return "";
      }
    },
  },

  /**
   * Placeholder for the current working directory. If the current application is not Finder, this placeholder will not be replaced.
   */
  "{{currentDirectory}}": {
    name: "Current Directory",
    rules: [
      async (str: string, context?: LocalDataObject) => {
        try {
          return (await getFrontmostApplication()).name == "Finder";
        } catch (e) {
          return false;
        }
      },
    ],
    apply: async (str: string, context?: LocalDataObject) => {
      return (
        await runAppleScript(`try
        tell application "Finder" to return POSIX path of (insertion location as alias)
      end try`)
      ).replaceAll(/({{|}})/g, "");
    },
  },

  /**
   * Placeholder for the current URL in any supported browser. See {@link SupportedBrowsers} for the list of supported browsers. If the current application is not a supported browser, this placeholder will not be replaced.
   */
  "{{currentURL}}": {
    name: "Current URL",
    rules: [
      async (str: string, context?: LocalDataObject) => {
        try {
          return SupportedBrowsers.includes((await getFrontmostApplication()).name);
        } catch (e) {
          return false;
        }
      },
    ],
    apply: async (str: string, context?: LocalDataObject) => {
      try {
        const appName = (await getFrontmostApplication()).name;
        return (await getCurrentURL(appName)).url;
      } catch (e) {
        return "";
      }
    },
  },

  /**
   * Placeholder for the visible text of the current tab in any supported browser. See {@link SupportedBrowsers} for the list of supported browsers. If the current application is not a supported browser, this placeholder will not be replaced.
   */
  "{{currentTabText}}": {
    name: "Current Tab Text",
    aliases: ["{{tabText}}"],
    rules: [
      async (str: string, context?: LocalDataObject) => {
        try {
          return SupportedBrowsers.includes((await getFrontmostApplication()).name);
        } catch (e) {
          return false;
        }
      },
    ],
    apply: async (str: string, context?: LocalDataObject) => {
      try {
        const appName = (await getFrontmostApplication()).name;
        const URL = (await getCurrentURL(appName)).url;
        const URLText = await getTextOfWebpage(URL);
        return URLText.replaceAll(/({{|}})/g, "");
      } catch (e) {
        return "";
      }
    },
  },

  /**
   * Placeholder for the username of the currently logged-in user. Barring any issues, this should always be replaced.
   */
  "{{user}}": {
    name: "User",
    aliases: ["{{username}}"],
    rules: [],
    apply: async (str: string, context?: LocalDataObject) => {
      return os.userInfo().username;
    },
  },

  /**
   * Placeholder for the home directory of the currently logged-in user. Barring any issues, this should always be replaced.
   */
  "{{homedir}}": {
    name: "Home Directory",
    aliases: ["{{homeDirectory}}"],
    rules: [],
    apply: async (str: string, context?: LocalDataObject) => {
      return os.homedir();
    },
  },

  /**
   * Placeholder for the hostname of the current machine. Barring any issues, this should always be replaced.
   */
  "{{hostname}}": {
    name: "Hostname",
    rules: [],
    apply: async (str: string, context?: LocalDataObject) => {
      return os.hostname();
    },
  },

  /**
   * Placeholder for a summary of the user's current location.
   */
  "{{location}}": {
    name: "Location",
    rules: [],
    apply: async (str: string, context?: LocalDataObject) => {
      const location = await LocationManager.getLocation();
      const address = `${location.streetNumber} ${location.street}, ${location.city}, ${location.state} ${location.postalCode}`;
      return `Address: ${address}, ${location.country}${
        address.includes(location.name.toString()) ? `` : `\nName: ${location.name}`
      }\nLatitude: ${location.latitude}\nLongitude: ${location.longitude}`;
    },
  },

  /**
   * Placeholder for the name of the user's current latitude.
   */
  "{{latitude}}": {
    name: "Latitude",
    aliases: ["{{lat}}"],
    rules: [],
    apply: async (str: string, context?: LocalDataObject) => {
      return (await LocationManager.getLatitude()).toString();
    },
  },

  /**
   * Placeholder for the name of the user's current longitude.
   */
  "{{longitude}}": {
    name: "Longitude",
    aliases: ["{{long}}"],
    rules: [],
    apply: async (str: string, context?: LocalDataObject) => {
      return (await LocationManager.getLongitude()).toString();
    },
  },

  /**
   * Placeholder for the name of the user's street address.
   */
  "{{address}}": {
    name: "Address",
    aliases: ["{{streetAddress}}"],
    rules: [],
    apply: async (str: string, context?: LocalDataObject) => {
      return await LocationManager.getStreetAddress();
    },
  },

  /**
   * Placeholder for the list of names of all Siri Shortcuts on the current machine. The list is comma-separated.
   */
  "{{shortcuts}}": {
    name: "Siri Shortcuts",
    rules: [],
    apply: async (str: string, context?: LocalDataObject) => {
      return await runAppleScript(`try
        tell application "Shortcuts Events" to return name of every shortcut
      end try`);
    },
  },

  /**
   * Placeholder for the current date supporting an optional format argument. Defaults to "Month Day, Year". Barring any issues, this should always be replaced.
   */
  "{{date( format=(\"|').*?(\"|'))?}}": {
    name: "Date",
    aliases: ["{{currentDate( format=(\"|').*?(\"|'))?}}"],
    rules: [],
    apply: async (str: string, context?: LocalDataObject) => {
      const format = str.match(/(?<=format=("|')).*?(?=("|'))/)?.[0] || "MMMM d, yyyy";
      return await runAppleScript(`use framework "Foundation"
        set currentDate to current application's NSDate's alloc()'s init()
        try
          set formatter to current application's NSDateFormatter's alloc()'s init()
          set format to "${format}"
          formatter's setAMSymbol:"AM"
          formatter's setPMSymbol:"PM"
          formatter's setDateFormat:format
          return (formatter's stringFromDate:currentDate) as string
        end try`);
    },
  },

  /**
   * Placeholder for the current day of the week, e.g. "Monday", using en-US as the default locale. Supports an optional locale argument. Barring any issues, this should always be replaced.
   */
  "{{day( locale=(\"|').*?(\"|'))?}}": {
    name: "Day of the Week",
    aliases: [
      "{{dayName( locale=(\"|').*?(\"|'))?}}",
      "{{currentDay( locale=(\"|').*?(\"|'))?}}",
      "{{currentDayName( locale=(\"|').*?(\"|'))?}}",
    ],
    rules: [],
    apply: async (str: string, context?: LocalDataObject) => {
      const locale = str.match(/(?<=locale=("|')).*?(?=("|'))/)?.[0] || "en-US";
      return new Date().toLocaleDateString(locale, { weekday: "long" });
    },
  },

  /**
   * Placeholder for the current time supporting an optional format argument. Defaults to "Hour:Minute:Second AM/PM". Barring any issues, this should always be replaced.
   */
  "{{time( format=(\"|').*?(\"|'))?}}": {
    name: "Time",
    aliases: ["{{currentTime( format=(\"|').*?(\"|'))?}}"],
    rules: [],
    apply: async (str: string, context?: LocalDataObject) => {
      const format = str.match(/(?<=format=("|')).*?(?=("|'))/)?.[0] || "HH:mm:s a";
      return await runAppleScript(`use framework "Foundation"
        set currentDate to current application's NSDate's alloc()'s init()
        try
          set formatter to current application's NSDateFormatter's alloc()'s init()
          set format to "${format}"
          formatter's setAMSymbol:"AM"
          formatter's setPMSymbol:"PM"
          formatter's setDateFormat:format
          return (formatter's stringFromDate:currentDate) as string
        end try`);
    },
  },

  /**
   * Placeholder for the current time supporting an optional format argument. Defaults to "Hour:Minute:Second AM/PM". Barring any issues, this should always be replaced.
   */
  "{{timezone}}": {
    name: "Timezone",
    aliases: ["{{timezone}}"],
    rules: [],
    apply: async (str: string, context?: LocalDataObject) => {
      return (
        Intl.DateTimeFormat(undefined, { timeZoneName: "long" })
          .formatToParts(new Date())
          .filter((s) => s.type == "timeZoneName")?.[0]?.value || Intl.DateTimeFormat().resolvedOptions().timeZone
      );
    },
  },

  /**
   * Placeholder for the default language for the current user. Barring any issues, this should always be replaced.
   */
  "{{systemLanguage}}": {
    name: "System Language",
    aliases: ["{{language}}"],
    rules: [],
    apply: async (str: string, context?: LocalDataObject) => {
      return await runAppleScript(`use framework "Foundation"
                set locale to current application's NSLocale's autoupdatingCurrentLocale()
                set langCode to locale's languageCode()
                return (locale's localizedStringForLanguageCode:langCode) as text`);
    },
  },

  /**
   * Placeholder for the last application focused before the current application. If there is no previous application, this placeholder will not be replaced.
   */
  "{{previousApp}}": {
    name: "Previous Application",
    aliases: [
      "{{previousAppName}}",
      "{{lastApp}}",
      "{{lastAppName}}",
      "{{previousApplication}}",
      "{{lastApplication}}",
      "{{previousApplicationName}}",
      "{{lastApplicationName}}",
    ],
    rules: [
      async (str: string, context?: LocalDataObject) => {
        try {
          const recents = await getStorage(StorageKey.RECENT_APPS);
          if (!recents) return false;
          if (!Array.isArray(recents)) return false;
          return recents.length > 1;
        } catch (e) {
          return false;
        }
      },
    ],
    apply: async (str: string, context?: LocalDataObject) => {
      const recents = await getStorage(StorageKey.RECENT_APPS);
      if (Array.isArray(recents)) {
        return recents[1].name;
      }
      return "";
    },
  },

  /**
   * Placeholder for a unique UUID. UUIDs are tracked in the {@link StorageKey.USED_UUIDS} storage key. The UUID will be unique for each use of the placeholder (but there is no guarantee that it will be unique across different instances of the extension, e.g. on different computers).
   */
  "{{uuid}}": {
    name: "UUID",
    aliases: ["{{UUID}}"],
    rules: [],
    apply: async (str: string, context?: LocalDataObject) => {
      let newUUID = crypto.randomUUID();
      const usedUUIDs = await getStorage(StorageKey.USED_UUIDS);
      if (Array.isArray(usedUUIDs)) {
        while (usedUUIDs.includes(newUUID)) {
          newUUID = crypto.randomUUID();
        }
        usedUUIDs.push(newUUID);
        await setStorage(StorageKey.USED_UUIDS, usedUUIDs);
      } else {
        await setStorage(StorageKey.USED_UUIDS, [newUUID]);
      }
      return newUUID;
    },
  },

  /**
   * Placeholder for a list of all previously used UUIDs since Pins' LocalStorage was last reset.
   */
  "{{usedUUIDs}}": {
    name: "Previously Used UUIDs",
    rules: [],
    apply: async (str: string, context?: LocalDataObject) => {
      const usedUUIDs = await getStorage(StorageKey.USED_UUIDS);
      if (Array.isArray(usedUUIDs)) {
        return usedUUIDs.join(", ");
      }
      return "";
    },
  },

  /**
   * Placeholder for the name of the most recently opened pin before the current one. If there is no last opened pin, this placeholder will not be replaced. The substitution will be URL-encoded.
   */
  "{{previousPinName}}": {
    name: "Last Opened Pin Name",
    aliases: ["{{lastPinName}}"],
    rules: [
      async (str: string, context?: LocalDataObject) => {
        try {
          const previousPin = getStorage(StorageKey.LAST_OPENED_PIN);
          if (!previousPin) return false;
          return true;
        } catch (e) {
          return false;
        }
      },
    ],
    apply: async (str: string, context?: LocalDataObject) => {
      try {
        const previousPinTarget = (await getPreviousPin())?.name || "";
        return encodeURI(previousPinTarget);
      } catch (e) {
        return "";
      }
    },
  },

  /**
   * Placeholder for the target of the most recently opened pin before the current one. If there is no last opened pin, this placeholder will not be replaced. The substitution will be URL-encoded.
   */
  "{{previousPinTarget}}": {
    name: "Last Opened Pin Target",
    aliases: ["{{lastPinTarget}}"],
    rules: [
      async (str: string, context?: LocalDataObject) => {
        try {
          const previousPin = getStorage(StorageKey.LAST_OPENED_PIN);
          if (!previousPin) return false;
          return true;
        } catch (e) {
          return false;
        }
      },
    ],
    apply: async (str: string, context?: LocalDataObject) => {
      try {
        const previousPinTarget = (await getPreviousPin())?.url || "";
        return encodeURI(previousPinTarget);
      } catch (e) {
        return "";
      }
    },
  },

  /**
   * Placeholder for the comma-separated list of pin names. The list is sorted by most recently opened pin first.
   */
  "{{pinNames( amount=[0-9]+)?}}": {
    name: "Pin Names",
    rules: [],
    apply: async (str: string, context?: LocalDataObject) => {
      let numToSelect = parseInt(str.match(/(?<=amount=)[0-9]+/)?.[0] || "-1");
      try {
        const pins: Pin[] = (await getStorage(StorageKey.LOCAL_PINS)) || [];
        if (numToSelect >= 0) {
          numToSelect = Math.min(numToSelect, pins.length);
          while (pins.length > numToSelect) {
            pins.splice(Math.floor(Math.random() * pins.length), 1);
          }
        }
        const pinNames = pins
          .sort((a, b) => new Date(b.lastOpened || 0).getTime() - new Date(a.lastOpened || 0).getTime())
          .map((pin) => pin.name);
        return pinNames.join(", ");
      } catch (e) {
        return "";
      }
    },
  },

  /**
   * Placeholder for the newline-separated list of pin targets. The list is sorted by most recently opened pin first.
   */
  "{{pinTargets( amount=[0-9]+)?}}": {
    name: "Pin Targets",
    rules: [],
    apply: async (str: string, context?: LocalDataObject) => {
      let numToSelect = parseInt(str.match(/(?<=amount=)[0-9]+/)?.[0] || "-1");
      try {
        const pins: Pin[] = (await getStorage(StorageKey.LOCAL_PINS)) || [];
        if (numToSelect >= 0) {
          numToSelect = Math.min(numToSelect, pins.length);
          while (pins.length > numToSelect) {
            pins.splice(Math.floor(Math.random() * pins.length), 1);
          }
        }
        const pinTargets = sortPins(pins, [], undefined, SORT_FN.LAST_OPENED).map((pin) => pin.url);
        return pinTargets.join(", ").replaceAll("{{", "[[").replaceAll("}}", "]]");
      } catch (e) {
        return "";
      }
    },
  },

  /**
   * Placeholder for the JSON representation of all pins.
   */
  "{{pins( amount=[0-9]+)?}}": {
    name: "Pins JSON",
    rules: [],
    apply: async (str: string, context?: LocalDataObject) => {
      let numToSelect = parseInt(str.match(/(?<=amount=)[0-9]+/)?.[0] || "-1");
      try {
        const pins: Pin[] = (await getStorage(StorageKey.LOCAL_PINS)) || [];
        if (numToSelect >= 0) {
          numToSelect = Math.min(numToSelect, pins.length);
          const selectedPins = [];
          for (let i = 0; i < numToSelect; i++) {
            const randomIndex = Math.floor(Math.random() * pins.length);
            selectedPins.push(pins[randomIndex]);
            pins.splice(randomIndex, 1);
          }
          return JSON.stringify(selectedPins).replaceAll("{{", "[[").replaceAll("}}", "]]");
        }
        return JSON.stringify(pins).replaceAll("{{", "[[").replaceAll("}}", "]]");
      } catch (e) {
        return "";
      }
    },
  },

  /**
   * Placeholder for the JSON representation of all pins.
   */
  '{{(statistics|stats|pinStats|pinStatistics)( sort="(alpha|alphabetical|freq|frequency|recency|dateCreated)")?( amount=[0-9]+)?}}':
    {
      name: "Pin Statistics",
      rules: [],
      apply: async (str: string, context?: LocalDataObject) => {
        let sortMethod = str.match(/(?<=sort=("|')).*?(?=("|'))/)?.[0] || "freq";
        if (sortMethod == "alpha") sortMethod = "alphabetical";
        if (sortMethod == "freq") sortMethod = "frequency";

        let numToSelect = parseInt(str.match(/(?<=amount=)[0-9]+/)?.[0] || "-1");

        try {
          const pins: Pin[] = (await getStorage(StorageKey.LOCAL_PINS)) || [];
          const groups: Group[] = (await getStorage(StorageKey.LOCAL_GROUPS)) || [];

          if (numToSelect >= 0) {
            numToSelect = Math.min(numToSelect, pins.length);
            while (pins.length > numToSelect) {
              pins.splice(Math.floor(Math.random() * pins.length), 1);
            }
          }

          const stats = sortPins(pins, groups, sortMethod as keyof typeof SORT_STRATEGY).map(
            (pin) => `${pin.name}:\n\t${(getPinStatistics(pin, pins) as string).replaceAll("\n\n", "\n\t")}`,
          );
          return stats.join("\n\n");
        } catch (e) {
          return "";
        }
      },
    },

  /**
   * Placeholder for the comma-separated list of group names. The list's order matches the order of groups in the 'View Pins' command.
   */
  "{{groupNames( amount=[0-9]+)?}}": {
    name: "Group Names",
    rules: [],
    apply: async (str: string, context?: LocalDataObject) => {
      let numToSelect = parseInt(str.match(/(?<=amount=)[0-9]+/)?.[0] || "-1");
      try {
        const groups: Group[] = (await getStorage(StorageKey.LOCAL_GROUPS)) || [];
        if (numToSelect >= 0) {
          numToSelect = Math.min(numToSelect, groups.length);
          while (groups.length > numToSelect) {
            groups.splice(Math.floor(Math.random() * groups.length), 1);
          }
        }
        return groups.map((group) => group.name).join(", ");
      } catch (e) {
        return "";
      }
    },
  },

  /**
   * Placeholder for the JSON representation of all groups.
   */
  "{{groups( amount=[0-9]+)?}}": {
    name: "Groups JSON",
    rules: [],
    apply: async (str: string, context?: LocalDataObject) => {
      let numToSelect = parseInt(str.match(/(?<=amount=)[0-9]+/)?.[0] || "-1");
      try {
        const groups: Group[] = (await getStorage(StorageKey.LOCAL_GROUPS)) || [];
        if (numToSelect >= 0) {
          numToSelect = Math.min(numToSelect, groups.length);
          while (groups.length > numToSelect) {
            groups.splice(Math.floor(Math.random() * groups.length), 1);
          }
        }
        return JSON.stringify(groups).replaceAll("{{", "[[").replaceAll("}}", "]]");
      } catch (e) {
        return "";
      }
    },
  },

  /**
   * Placeholder for the visible text content at a given URL.
   */
  "{{(url|URL):.*?}}": {
    name: "Visible Text Content of URL",
    rules: [],
    apply: async (str: string, context?: LocalDataObject) => {
      try {
        const URL = str.match(/(?<=(url|URL):).*?(?=}})/)?.[0];
        if (!URL) return "";
        return await getTextOfWebpage(URL);
      } catch (e) {
        return "";
      }
    },
  },

  /**
   * Placeholder for the raw text of a file at the given path. The path can be absolute or relative to the user's home directory (e.g. `~/Desktop/file.txt`). The file must be readable as UTF-8 text, or the placeholder will be replaced with an empty string.
   */
  "{{file:(.|^[\\s\\n\\r])*?}}": {
    name: "File Contents",
    rules: [],
    apply: async (str: string, context?: LocalDataObject) => {
      const target = str.match(/(?<=(file:)).*?(?=}})/)?.[0];
      if (!target) return "";

      const filePath = target.startsWith("~") ? target.replace("~", os.homedir()) : target;
      if (filePath == "") return "";

      if (!filePath.startsWith("/")) return "";

      try {
        const text = fs.readFileSync(filePath, "utf-8");
        return text;
      } catch (e) {
        return "";
      }
    },
  },

  /**
   * Directive to set the value of a persistent variable. If the variable does not exist, it will be created. The placeholder will always be replaced with an empty string.
   */
  "{{set [a-zA-Z0-9_]+:.*?}}": {
    name: "Set Persistent Variable",
    rules: [],
    apply: async (str: string, context?: LocalDataObject) => {
      const matches = str.match(/{{set ([a-zA-Z0-9_]+):(.*?)}}/);
      if (matches) {
        const key = matches[1];
        const value = matches[2];
        await setPersistentVariable(key, value);
      }
      return "";
    },
  },

  /**
   * Directive to query Raycast AI and insert the response. If the query fails, the placeholder will be replaced with an empty string.
   *
   * Syntax: `{{ai:prompt}}` or `{{ai model="[model]":prompt}}` or `{{ai model="[model]" creativity=[decimal]:prompt}}`
   *
   * The model and creativity are optional. The default model is `gpt-3.5-turbo` and the default creativity is `1.0`. The model can be either `gpt-3.5-turbo` or `text-davinci-003`. The creativity must be a decimal between 0 and 1.
   */
  '{{(askAI|askai|AI|ai)( model="(([^{]|{(?!{)|{{[\\s\\S]*?}})*?)")?( creativity=(([^{]|{(?!{)|{{[\\s\\S]*?}})*?))?:(([^{]|{(?!{)|{{[\\s\\S]*?}})*?)}}':
    {
      name: "Ask AI",
      rules: [],
      apply: async (str: string, context?: LocalDataObject) => {
        const matches = str.match(
          /{{(askAI|askai|AI|ai)( model="(([^{]|{(?!{)|{{[\s\S]*?}})*?)")?( creativity=(([^{]|{(?!{)|{{[\s\S]*?}})*?))?:(([^{]|{(?!{)|{{[\s\S]*?}})*?)}}/,
        );
        if (matches && environment.canAccess(AI)) {
          const toast = await showToast({ title: "Querying AI...", style: Toast.Style.Animated });
          const model = matches[3] == "text-davinci-003" ? "text-davinci-003" : "gpt-3.5-turbo";
          const creativity = matches[6] || "1.0";
          let query = matches[8].substring(0, model == "text-davinci-003" ? 4000 : 2048);
          let result = "";
          let attempt = 0;
          let waiting = true;
          while (waiting) {
            try {
              result = await AI.ask(query, { model: model, creativity: parseFloat(creativity) || 1.0 });
            } catch {
              attempt++;
              query = query.substring(0, query.length / 1.5);
            }
            if (result != "" || attempt > 10) {
              waiting = false;
            }
          }
          toast.title = "Received Response";
          toast.style = Toast.Style.Success;
          return result.trim().replaceAll('"', "'");
        }
        return "";
      },
    },

  /**
   * Directive to copy the provided text to the clipboard. The placeholder will always be replaced with an empty string.
   */
  "{{copy:(([^{]|{(?!{)|{{[\\s\\S]*?}})*?)}}": {
    name: "Copy to Clipboard",
    rules: [],
    apply: async (str: string, context?: LocalDataObject) => {
      const text = str.match(/(?<=(copy:))(([^{]|{(?!{)|{{[\s\S]*?}})*?)(?=}})/)?.[0];
      if (!text) return "";
      await Clipboard.copy(text);
      if (environment.commandName == "index") {
        await showHUD("Copied to Clipboard");
      } else {
        await showToast({ title: "Copied to Clipboard" });
      }
      return "";
    },
  },

  /**
   * Directive to paste the provided text in the frontmost application. The placeholder will always be replaced with an empty string.
   */
  "{{paste:(([^{]|{(?!{)|{{[\\s\\S]*?}})*?)}}": {
    name: "Paste Text",
    rules: [],
    apply: async (str: string, context?: LocalDataObject) => {
      const text = str.match(/(?<=(paste:))(([^{]|{(?!{)|{{[\s\S]*?}})*?)(?=}})/)?.[0];
      if (!text) return "";
      await Clipboard.paste(text);
      await showHUD("Pasted Into Frontmost App");
      return "";
    },
  },

  /**
   * Directive to type the provided text into the frontmost application. The placeholder will always be replaced with an empty string.
   */
  "{{type:(([^{]|{(?!{)|{{[\\s\\S]*?}})*?)}}": {
    name: "Type Text",
    rules: [],
    apply: async (str: string, context?: LocalDataObject) => {
      const text = str.match(/(?<=(type:))(([^{]|{(?!{)|{{[\s\S]*?}})*?)(?=}})/)?.[0];
      if (!text) return "";
      await showHUD("Typing Into Frontmost App");
      await runAppleScript(`tell application "System Events" to keystroke "${text}"`);
      return "";
    },
  },

  /**
   * Directive to display an alert with the provided text. The placeholder will always be replaced with an empty string.
   *
   * Syntax: `{{alert title="...":Message}}` or `{{alert timeout=[number] title="...":Message}}`
   *
   * The timeout and title are optional. If no timeout is provided, the alert will timeout after 10 seconds. The default title is "Pins". You must provide a message.
   */
  '{{alert( timeout=([0-9]+))?( title="(([^{]|(?!{)|{{[\\s\\S]*?}})*?)")?:(([^{]|{(?!{)|{{[\\s\\S]*?}})+?)}}': {
    name: "Display Alert",
    rules: [],
    apply: async (str: string, context?: LocalDataObject) => {
      const matches = str.match(
        /{{alert( timeout=([0-9]+))?( title="(([^{]|(?!{)|{{[\s\S]*?}})*?)")?:(([^{]|{(?!{)|{{[\s\S]*?}})+?)}}/,
      );
      if (matches) {
        const timeout = parseInt(matches[2]) || 10;
        const title = matches[4] || "Pins";
        const message = matches[6];
        try {
          await runAppleScript(
            `display alert "${title.replaceAll('"', "'")}"${
              message ? ` message "${message.replaceAll('"', "'")}"` : ""
            } giving up after ${timeout} as critical`,
          );
        } catch (e) {
          if ((e as Error).message.includes("timed out")) {
            await showHUD("Alert Timed Out");
          }
          return "";
        }
      }
      return "";
    },
  },

  /**
   * Directive to display a dialog with the provided text. The placeholder will be replaced with an empty string unless `input=true` is provided, in which case the placeholder will be replaced with the user's input. If the user cancels the dialog, the placeholder will be replaced with an empty string.
   *
   * Syntax: `{{dialog input=[true/false] timeout=[number] title="...":Message}}`
   *
   * The input setting, timeout, and title are optional. If no timeout is provided, the dialog will timeout after 30 seconds. If no title is provided, the title will be "Pins". The default input setting is `false`. You must provide a message.
   */
  '{{dialog( input=(true|false))?( timeout=([0-9]+))?( title="(([^{]|(?!{)|{{[\\s\\S]*?}})*?)")?:(([^{]|{(?!{)|{{[\\s\\S]*?}})+?)}}':
    {
      name: "Display Dialog",
      rules: [],
      apply: async (str: string, context?: LocalDataObject) => {
        console.log("ya");
        const matches = str.match(
          /{{dialog( input=(true|false))?( timeout=([0-9]+))?( title="(([^{]|(?!{)|{{[\s\S]*?}})*?)")?:(([^{]|{(?!{)|{{[\s\S]*?}})+?)}}/,
        );
        if (matches) {
          const input = matches[2] == "true";
          const timeout = parseInt(matches[4]) || 30;
          const title = matches[6] || "Pins";
          const message = matches[8];
          const result = await runAppleScript(
            `display dialog "${message.replaceAll('"', "'")}" with title "${title.replaceAll('"', "'")}"${
              input ? ' default answer ""' : ""
            } giving up after ${timeout}`,
            { timeout: timeout * 1000 },
          );
          if (input) {
            const textReturned = result.match(/(?<=text returned:)(.|[ \n\r\s])*?(?=,)/)?.[0] || "";
            return textReturned.trim().replaceAll('"', "'");
          }
        }
        return "";
      },
    },

  /**
   * Directive to speak the provided text. The placeholder will always be replaced with an empty string.
   *
   * Syntax: `{{say voice="[voice]" speed=[number] pitch=[number] volume=[number]:Message}}`
   *
   * All arguments are optional. If no voice, speed, pitch, or volume are provided, the system defaults will be used.
   */
  '{{say( voice="[A-Za-z)( ._-]")?( speed=[0-9.]+?)?( pitch=([0-9.]+?))?( volume=[0-9.]+?)?:(([^{]|{(?!{)|{{[\\s\\S]*?}})*?)}}':
    {
      name: "Speak Text",
      rules: [],
      apply: async (str: string, context?: LocalDataObject) => {
        const matches = str.match(
          /{{say( voice="([A-Za-z)( ._-]+?)")?( speed=([0-9.]+?))?( pitch=([0-9.]+?))?( volume=([0-9.]+?))?:(([^{]|{(?!{)|{{[\s\S]*?}})+?)}}/,
        );
        if (matches) {
          const voice = matches[2] || undefined;
          const speed = matches[4] || undefined;
          const pitch = matches[6] || undefined;
          const volume = matches[8] || undefined;
          const query = matches[9];
          await runAppleScript(
            `say "${query}"${voice ? ` using "${voice}"` : ""}${speed ? ` speaking rate ${speed}` : ""}${
              pitch ? ` pitch ${pitch}` : ""
            }${volume ? ` volume ${volume}` : ""}`,
          );
        }
        return "";
      },
    },

  /**
   * Directive to display a toast or HUD with the provided text. The placeholder will always be replaced with an empty string. Whether a toast or HUD is displayed depends on the context (e.g. if the Raycast window is focused, a toast will be displayed; otherwise, a HUD will be displayed).
   *
   * Syntax: `{{toast style="[success/failure/fail]" title="...":Message}}` or `{{hud style="[success/failure/fail]" title="...":Message}}`
   *
   * The style and message are optional. If no style is provided, the style will be "success". If no message is provided, the message will be empty.
   */
  '{{(toast|hud|HUD)( style="(success|failure|fail)")?( message="(([^{]|(?!{)|{{[\\s\\S]*?}})*?)")?:(([^{]|{(?!{)|{{[\\s\\S]*?}})+?)}}':
    {
      name: "Display Toast or HUD",
      rules: [],
      apply: async (str: string, context?: LocalDataObject) => {
        const matches = str.match(
          /{(toast|hud|HUD)( style="(success|failure|fail)")?( message="(([^{]|(?!{)|{{[\s\S]*?}})*?)")?:(([^{]|{(?!{)|{{[\s\S]*?}})+?)}}/,
        );
        if (matches) {
          const style = matches[3] == "failure" || matches[3] == "fail" ? Toast.Style.Failure : Toast.Style.Success;
          const message = matches[5] || "";
          const title = matches[7];
          await showToast({ title: title, message: message, style: style });
        }
        return "";
      },
    },

  /**
   * Placeholder for output of an AppleScript script. If the script fails, this placeholder will be replaced with an empty string. No sanitization is done in the script input; the expectation is that users will only use this placeholder with trusted scripts.
   */
  "{{(as|AS):(.|[ \\n\\r\\s])*?}}": {
    name: "AppleScript",
    rules: [],
    apply: async (str: string, context?: LocalDataObject) => {
      try {
        const script = str.match(/(?<=(as|AS):)(.|[ \n\r\s])*?(?=}})/)?.[0];
        if (!script) return "";
        return await runAppleScript(`try
            ${script}
          end try`);
      } catch (e) {
        return "";
      }
    },
  },

  /**
   * Placeholder for output of a JavaScript for Automation script. If the script fails, this placeholder will be replaced with an empty string. No sanitization is done in the script input; the expectation is that users will only use this placeholder with trusted scripts.
   */
  "{{(jxa|JXA):(.|[ \\n\\r\\s])*?}}": {
    name: "JavaScript for Automation",
    rules: [],
    apply: async (str: string, context?: LocalDataObject) => {
      try {
        const script = str.match(/(?<=(jxa|JXA):)(.|[ \n\r\s])*?(?=}})/)?.[0];
        if (!script) return "";
        return execSync(
          `osascript -l JavaScript -e "${script
            .replaceAll('"', '\\"')
            .replaceAll("`", "\\`")
            .replaceAll("$", "\\$")
            .replaceAll(new RegExp(/[\n\r]/, "g"), " \\\n\n")}"`,
        ).toString();
      } catch (e) {
        return "";
      }
    },
  },

  /**
   * Placeholder for output of a shell script. If the script fails, this placeholder will be replaced with an empty string. No sanitization is done on the script input; the expectation is that users will only use this placeholder with trusted scripts.
   */
  "{{shell( .*)?:(.|[ \\n\\r\\s])*?}}": {
    name: "Shell Script",
    rules: [],
    apply: async (str: string, context?: LocalDataObject) => {
      try {
        const script = str.match(/(?<=shell( .*)?:)(.|[ \n\r\s])*?(?=}})/)?.[0];
        if (!script) return "";

        const bin =
          str
            .matchAll(/(?<=shell)(.*)?(?=:(.|[ \n\r\s])*?}})/g)
            .next()
            .value?.[0]?.trim() || "/bin/zsh";
        return execSync(script, { shell: bin }).toString();
      } catch (e) {
        return "";
      }
    },
  },

  /**
   * Placeholder for output of a JavaScript script. If the script fails, this placeholder will be replaced with an empty string. The script is run in a sandboxed environment.
   */
  "{{(js|JS):(.|[ \\n\\r\\s])*?}}": {
    name: "JavaScript",
    rules: [],
    apply: async (str: string, context?: LocalDataObject) => {
      try {
        const script = str.match(/(?<=(js|JS):)(.|[ \n\r\s])*?(?=}})/)?.[0];
        if (!script) return "";
        const sandbox = {
          clipboardText: async () => await Placeholders.allPlaceholders["{{clipboardText}}"].apply("{{clipboardText}}"),
          selectedText: async () => await Placeholders.allPlaceholders["{{selectedText}}"].apply("{{selectedText}}"),
          currentAppName: async () =>
            await Placeholders.allPlaceholders["{{currentAppName}}"].apply("{{currentAppName}}"),
          currentAppPath: async () =>
            await Placeholders.allPlaceholders["{{currentAppPath}}"].apply("{{currentAppPath}}"),
          currentDirectory: async () =>
            await Placeholders.allPlaceholders["{{currentDirectory}}"].apply("{{currentDirectory}}"),
          currentURL: async () => await Placeholders.allPlaceholders["{{currentURL}}"].apply("{{currentURL}}"),
          user: async () => await Placeholders.allPlaceholders["{{user}}"].apply("{{user}}"),
          homedir: async () => await Placeholders.allPlaceholders["{{homedir}}"].apply("{{homedir}}"),
          hostname: async () => await Placeholders.allPlaceholders["{{hostname}}"].apply("{{hostname}}"),
          date: async (format?: string) =>
            await Placeholders.allPlaceholders[`{{date( format=("|').*?("|'))?}}`].apply(
              `{{date${format ? ` format="${format}"` : ""}}}`,
            ),
          time: async () => await Placeholders.allPlaceholders[`{{time( format=("|').*?("|'))?}}`].apply("{{time}}"),
          timezone: async () => await Placeholders.allPlaceholders["{{timezone}}"].apply("{{timezone}}"),
          day: async () => await Placeholders.allPlaceholders[`{{day( locale=("|').*?("|'))?}}`].apply("{{day}}"),
          currentTabText: async () =>
            await Placeholders.allPlaceholders["{{currentTabText}}"].apply("{{currentTabText}}"),
          systemLanguage: async () =>
            await Placeholders.allPlaceholders["{{systemLanguage}}"].apply("{{systemLanguage}}"),
          previousApp: async () => await Placeholders.allPlaceholders["{{previousApp}}"].apply("{{previousApp}}"),
          uuid: async () => await Placeholders.allPlaceholders["{{uuid}}"].apply("{{uuid}}"),
          usedUUIDs: async () => await Placeholders.allPlaceholders["{{usedUUIDs}}"].apply("{{usedUUIDs}}"),
          url: async (url: string) => await Placeholders.allPlaceholders["{{(url|URL):.*?}}"].apply(`{{url:${url}}}`),
          as: async (script: string) =>
            await Placeholders.allPlaceholders["{{(as|AS):(.|[ \\n\\r\\s])*?}}"].apply(`{{as:${script}}}`),
          jxa: async (script: string) =>
            await Placeholders.allPlaceholders["{{(jxa|JXA):(.|[ \\n\\r\\s])*?}}"].apply(`{{jxa:${script}}}`),
          shell: async (script: string) =>
            await Placeholders.allPlaceholders["{{shell( .*)?:(.|[ \\n\\r\\s])*?}}"].apply(`{{shell:${script}}}`),
          previousPinName: async () =>
            await Placeholders.allPlaceholders["{{previousPinName}}"].apply("{{previousPinName}}"),
          previousPinTarget: async () =>
            await Placeholders.allPlaceholders["{{previousPinTarget}}"].apply("{{previousPinTarget}}"),
          reset: async (variable: string) =>
            await Placeholders.allPlaceholders["{{reset [a-zA-Z0-9_]+}}"].apply(`{{reset ${variable}}}`),
          get: async (variable: string) =>
            await Placeholders.allPlaceholders["{{get [a-zA-Z0-9_]+}}"].apply(`{{get ${variable}}}`),
          delete: async (variable: string) =>
            await Placeholders.allPlaceholders["{{delete [a-zA-Z0-9_]+}}"].apply(`{{delete ${variable}}}`),
          set: async (variable: string, value: string) =>
            await Placeholders.allPlaceholders["{{set [a-zA-Z0-9_]+:.*?}}"].apply(`{{set ${variable}:${value}}}`),
          shortcut: async (name: string) =>
            await Placeholders.allPlaceholders["{{shortcut:([\\s\\S]+?)( input=(\"|').*?(\"|'))?}}"].apply(
              `{{shortcut:${name}}}`,
            ),
          selectedFiles: async () => await Placeholders.allPlaceholders["{{selectedFiles}}"].apply("{{selectedFiles}}"),
          selectedFileContents: async () =>
            await Placeholders.allPlaceholders["{{selectedFileContents}}"].apply("{{selectedFileContents}}"),
          shortcuts: async () => await Placeholders.allPlaceholders["{{shortcuts}}"].apply("{{shortcuts}}"),
          copy: async (text: string) =>
            await Placeholders.allPlaceholders["{{copy:(([^{]|{(?!{)|{{[\\s\\S]*?}})*?)}}"].apply(`{{copy:${text}}}`),
          paste: async (text: string) =>
            await Placeholders.allPlaceholders["{{paste:(([^{]|{(?!{)|{{[\\s\\S]*?}})*?)}}"].apply(`{{paste:${text}}}`),
          ignore: async (text: string) =>
            await Placeholders.allPlaceholders["{{(ignore|IGNORE):[^}]*?}}"].apply(`{{ignore:${text}}}`),
          ai: async (prompt: string, model?: string, creativity?: number) =>
            await Placeholders.allPlaceholders[
              '{{(askAI|askai|AI|ai)( model="(([^{]|{(?!{)|{{[\\s\\S]*?}})*?)")?( creativity=(([^{]|{(?!{)|{{[\\s\\S]*?}})*?))?:(([^{]|{(?!{)|{{[\\s\\S]*?}})*?)}}'
            ].apply(
              `{{ai${model ? ` model="${model}"` : ""}${creativity ? ` creativity=${creativity}` : ""}:${prompt}}}`,
            ),
          alert: async (message: string, title?: string, timeout?: number) =>
            await Placeholders.allPlaceholders[
              '{{alert( timeout=([0-9]+))?( title="(([^{]|(?!{)|{{[\\s\\S]*?}})*?)")?:(([^{]|{(?!{)|{{[\\s\\S]*?}})+?)}}'
            ].apply(`{{alert${timeout ? ` timeout=${timeout}` : ""}${title ? ` title="${title}"` : ""}:${message}}}`),
          dialog: async (message: string, input?: boolean, timeout?: number, title?: string) =>
            await Placeholders.allPlaceholders[
              '{{dialog( input=(true|false))?( timeout=([0-9]+))?( title="(([^{]|(?!{)|{{[\\s\\S]*?}})*?)")?:(([^{]|{(?!{)|{{[\\s\\S]*?}})+?)}}'
            ].apply(
              `{{dialog${input ? " input=true" : ""}${timeout ? ` timeout=${timeout}` : ""}${
                title ? ` title="${title}"` : ""
              }:${message}}}`,
            ),
          say: async (message: string, voice?: string, speed?: number, pitch?: number, volume?: number) =>
            await Placeholders.allPlaceholders[
              '{{say( voice="[A-Za-z)( ._-]")?( speed=[0-9.]+?)?( pitch=([0-9.]+?))?( volume=[0-9.]+?)?:(([^{]|{(?!{)|{{[\\s\\S]*?}})*?)}}'
            ].apply(
              `{{say${voice ? ` voice="${voice}"` : ""}${speed ? ` speed=${speed}` : ""}${
                pitch ? ` pitch=${pitch}` : ""
              }${volume ? ` volume=${volume}` : ""}:${message}}}`,
            ),
          toast: async (title: string, message?: string) =>
            await Placeholders.allPlaceholders[
              '{{(toast|hud|HUD)( style="(success|failure|fail)")?( message="(([^{]|(?!{)|{{[\\s\\S]*?}})*?)")?:(([^{]|{(?!{)|{{[\\s\\S]*?}})+?)}}'
            ].apply(`{{toast${message ? ` message="${message}"` : ""}:${title}}}`),
          hud: async (title: string, message?: string) =>
            await Placeholders.allPlaceholders[
              '{{(toast|hud|HUD)( style="(success|failure|fail)")?( message="(([^{]|(?!{)|{{[\\s\\S]*?}})*?)")?:(([^{]|{(?!{)|{{[\\s\\S]*?}})+?)}}'
            ].apply(`{{hud${message ? ` message="${message}"` : ""}:${title}}}`),
          runningApplications: async (delim?: string) =>
            await Placeholders.allPlaceholders[
              '{{runningApplications( (delim|delimiter|delimiters|delims)="(([^{]|{(?!{)|{{[\\s\\S]*?}})*?)")?}}'
            ].apply(`{{runningApplications${delim ? ` delim="${delim}"` : ""}}}`),
          location: async () => await Placeholders.allPlaceholders["{{location}}"].apply(`{{location}}`),
          latitude: async () => await Placeholders.allPlaceholders["{{latitude}}"].apply(`{{latitude}}`),
          longitude: async () => await Placeholders.allPlaceholders["{{longitude}}"].apply(`{{longitude}}`),
          address: async () => await Placeholders.allPlaceholders["{{address}}"].apply(`{{address}}`),
        };
        return await vm.runInNewContext(script, sandbox, { timeout: 1000, displayErrors: true });
      } catch (e) {
        return "";
      }
    },
  },

  /**
   * Directive to ignore all content within the directive. Allows placeholders and directives to run without influencing the output.
   */
  "{{(ignore|IGNORE):[^}]*?}}": {
    name: "Ignore Content",
    rules: [],
    apply: async (str: string, context?: LocalDataObject) => {
      return "";
    },
  },
};

/**
 * Applies placeholders to a single string.
 * @param str The string to apply placeholders to.
 * @returns The string with placeholders applied.
 */
const applyToString = async (str: string, context?: LocalDataObject) => {
  let subbedStr = str;
  const placeholderDefinition = Object.entries(placeholders);
  for (const [key, placeholder] of placeholderDefinition) {
    if (
      !subbedStr.match(new RegExp(key, "g")) &&
      (placeholder.aliases?.every((alias) => !subbedStr.match(new RegExp(alias, "g"))) || !placeholder.aliases?.length)
    )
      continue;
    if (placeholder.aliases && placeholder.aliases.some((alias) => subbedStr.indexOf(alias) != -1)) {
      for (const alias of placeholder.aliases) {
        while (subbedStr.match(new RegExp(alias, "g")) != undefined) {
          subbedStr = subbedStr.replace(new RegExp(alias), await placeholder.apply(subbedStr, context));
        }
      }
    } else {
      while (subbedStr.match(new RegExp(key, "g")) != undefined) {
        subbedStr = subbedStr.replace(new RegExp(key), await placeholder.apply(subbedStr, context));
      }
    }
  }
  return subbedStr;
};

/**
 * Applies placeholders to an array of strings.
 * @param strs The array of strings to apply placeholders to.
 * @returns The array of strings with placeholders applied.
 */
const applyToStrings = async (strs: string[], context?: LocalDataObject) => {
  const subbedStrs: string[] = [];
  for (const str of strs) {
    subbedStrs.push(await applyToString(str));
  }
  return subbedStrs;
};

/**
 * Applies placeholders to the value of a single key in an object.
 * @param obj The object to apply placeholders to.
 * @param key The key of the value to apply placeholders to.
 * @returns The object with placeholders applied.
 */
const applyToObjectValueWithKey = async (obj: { [key: string]: unknown }, key: string, context?: LocalDataObject) => {
  const value = obj[key];
  if (typeof value === "string") {
    return await applyToString(value);
  } else if (Array.isArray(value)) {
    return await applyToStrings(value);
  } else if (typeof value === "object") {
    return await applyToObjectValuesWithKeys(
      value as { [key: string]: unknown },
      Object.keys(value as { [key: string]: unknown }),
    );
  } else {
    return (value || "undefined").toString();
  }
};

/**
 * Applies placeholders to an object's values, specified by keys.
 * @param obj The object to apply placeholders to.
 * @param keys The keys of the object to apply placeholders to.
 * @returns The object with placeholders applied.
 */
const applyToObjectValuesWithKeys = async (
  obj: { [key: string]: unknown },
  keys: string[],
  context?: LocalDataObject,
) => {
  const subbedObj: { [key: string]: unknown } = {};
  for (const key of keys) {
    subbedObj[key] = await applyToObjectValueWithKey(obj, key);
  }
  return subbedObj;
};

/**
 * Wrapper for all placeholder functions.
 */
export const Placeholders = {
  allPlaceholders: placeholders,
  applyToString: applyToString,
  applyToStrings: applyToStrings,
  applyToObjectValueWithKey: applyToObjectValueWithKey,
  applyToObjectValuesWithKeys: applyToObjectValuesWithKeys,
};

/**
 * A user-defined variable created via the {{set:...}} placeholder. These variables are stored in the extension's persistent local storage.
 */
export interface PersistentVariable {
  name: string;
  value: string;
  initialValue: string;
}

/**
 * Gets the current value of persistent variable from the extension's persistent local storage.
 * @param name The name of the variable to get.
 * @returns The value of the variable, or an empty string if the variable does not exist.
 */
export const getPersistentVariable = async (name: string): Promise<string> => {
  const vars: PersistentVariable[] = await getStorage(StorageKey.PERSISTENT_VARS);
  const variable = vars.find((variable) => variable.name == name);
  if (variable) {
    return variable.value;
  }
  return "";
};

/**
 * Sets the value of a persistent variable in the extension's persistent local storage. If the variable does not exist, it will be created. The most recently set variable will be always be placed at the end of the list.
 * @param name The name of the variable to set.
 * @param value The initial value of the variable.
 */
export const setPersistentVariable = async (name: string, value: string) => {
  const vars: PersistentVariable[] = await getStorage(StorageKey.PERSISTENT_VARS);
  const variable = vars.find((variable) => variable.name == name);
  if (variable) {
    vars.splice(vars.indexOf(variable), 1);
    variable.value = value;
    vars.push(variable);
  } else {
    vars.push({ name: name, value: value, initialValue: value });
  }
  await setStorage(StorageKey.PERSISTENT_VARS, vars);
};

/**
 * Resets the value of a persistent variable to its initial value. If the variable does not exist, nothing will happen.
 * @param name The name of the variable to reset.
 */
export const resetPersistentVariable = async (name: string): Promise<string> => {
  const vars: PersistentVariable[] = await getStorage(StorageKey.PERSISTENT_VARS);
  const variable = vars.find((variable) => variable.name == name);
  if (variable) {
    vars.splice(vars.indexOf(variable), 1);
    variable.value = variable.initialValue;
    vars.push(variable);
    await setStorage(StorageKey.PERSISTENT_VARS, vars);
    return variable.value;
  }
  return "";
};

/**
 * Deletes a persistent variable from the extension's persistent local storage. If the variable does not exist, nothing will happen.
 * @param name The name of the variable to delete.
 */
export const deletePersistentVariable = async (name: string) => {
  const vars: PersistentVariable[] = await getStorage(StorageKey.PERSISTENT_VARS);
  const variable = vars.find((variable) => variable.name == name);
  if (variable) {
    vars.splice(vars.indexOf(variable), 1);
    await setStorage(StorageKey.PERSISTENT_VARS, vars);
  }
};
