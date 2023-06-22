/* eslint-disable @typescript-eslint/no-unused-vars */ // Disable since many placeholder functions have unused parameters that are kept for consistency.
import { getFrontmostApplication, getSelectedText } from "@raycast/api";
import { Clipboard } from "@raycast/api";
import { runAppleScript } from "run-applescript";
import { SupportedBrowsers, getCurrentURL, getTextOfWebpage } from "./browser-utils";
import * as os from "os";
import * as crypto from "crypto";
import * as vm from "vm";
import { getStorage, setStorage } from "./utils";
import { StorageKey } from "./constants";
import { execSync } from "child_process";
import { getPreviousPin } from "./Pins";
import { getFinderSelection } from "./LocalData";

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
    rules: ((str: string) => Promise<boolean>)[];

    /**
     * The function that applies the placeholder to a string.
     * @param str The string to apply the placeholder to.
     * @returns The string with the placeholder applied.
     */
    apply: (str: string) => Promise<string>;
  };
};

/**
 * Placeholder specification.
 */
const placeholders: Placeholder = {
  /**
   * Placeholder for the text currently stored in the clipboard. If the clipboard is empty, this placeholder will not be replaced. Most clipboard content supplies a string format, such as file names when copying files in Finder.
   */
  "{{clipboardText}}": {
    name: "Clipboard Text",
    rules: [
      async (str: string) => {
        try {
          return (await Clipboard.readText()) !== "";
        } catch (e) {
          return false;
        }
      },
    ],
    apply: async (str: string) => {
      try {
        return (await Clipboard.readText()) || "";
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
      async (str: string) => {
        try {
          return (await getSelectedText()) !== "";
        } catch (e) {
          return false;
        }
      },
    ],
    apply: async (str: string) => {
      try {
        return (await getSelectedText()) || "";
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
    rules: [
      async (str: string) => {
        try {
          return (await getFinderSelection()).length > 0;
        } catch (e) {
          return false;
        }
      },
    ],
    apply: async (str: string) => {
      try {
        return (await getFinderSelection()).map((file) => file.path).join(", ");
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
    rules: [],
    apply: async (str: string) => {
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
    rules: [],
    apply: async (str: string) => {
      try {
        return (await getFrontmostApplication()).path || "";
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
      async (str: string) => {
        try {
          return (await getFrontmostApplication()).name == "Finder";
        } catch (e) {
          return false;
        }
      },
    ],
    apply: async (str: string) => {
      return await runAppleScript(`tell application "Finder" to return POSIX path of (insertion location as alias)`);
    },
  },

  /**
   * Placeholder for the current URL in any supported browser. See {@link SupportedBrowsers} for the list of supported browsers. If the current application is not a supported browser, this placeholder will not be replaced.
   */
  "{{currentURL}}": {
    name: "Current URL",
    rules: [
      async (str: string) => {
        try {
          return SupportedBrowsers.includes((await getFrontmostApplication()).name);
        } catch (e) {
          return false;
        }
      },
    ],
    apply: async (str: string) => {
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
    rules: [
      async (str: string) => {
        try {
          return SupportedBrowsers.includes((await getFrontmostApplication()).name);
        } catch (e) {
          return false;
        }
      },
    ],
    apply: async (str: string) => {
      try {
        const appName = (await getFrontmostApplication()).name;
        const URL = (await getCurrentURL(appName)).url;
        const URLText = await getTextOfWebpage(URL);
        return URLText;
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
    apply: async (str: string) => {
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
    apply: async (str: string) => {
      return os.homedir();
    },
  },

  /**
   * Placeholder for the hostname of the current machine. Barring any issues, this should always be replaced.
   */
  "{{hostname}}": {
    name: "Hostname",
    rules: [],
    apply: async (str: string) => {
      return os.hostname();
    },
  },

  /**
   * Placeholder for the current date supporting an optional format argument. Defaults to "Month Day, Year". Barring any issues, this should always be replaced.
   */
  "{{date( format=(\"|').*?(\"|'))?}}": {
    name: "Date",
    aliases: ["{{currentDate( format=(\"|').*?(\"|'))?}}"],
    rules: [],
    apply: async (str: string) => {
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
    aliases: ["{{dayName( locale=(\"|').*?(\"|'))?}}"],
    rules: [],
    apply: async (str: string) => {
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
    apply: async (str: string) => {
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
   * Placeholder for the default language for the current user. Barring any issues, this should always be replaced.
   */
  "{{systemLanguage}}": {
    name: "System Language",
    aliases: ["{{language}}"],
    rules: [],
    apply: async (str: string) => {
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
    aliases: ["{{previousAppName}}", "{{lastApp}}", "{{lastAppName}}"],
    rules: [
      async (str: string) => {
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
    apply: async (str: string) => {
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
    apply: async (str: string) => {
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
    apply: async (str: string) => {
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
    rules: [
      async (str: string) => {
        try {
          const previousPin = getStorage(StorageKey.LAST_OPENED_PIN);
          if (!previousPin) return false;
          return true;
        } catch (e) {
          return false;
        }
      },
    ],
    apply: async (str: string) => {
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
    rules: [
      async (str: string) => {
        try {
          const previousPin = getStorage(StorageKey.LAST_OPENED_PIN);
          if (!previousPin) return false;
          return true;
        } catch (e) {
          return false;
        }
      },
    ],
    apply: async (str: string) => {
      try {
        const previousPinTarget = (await getPreviousPin())?.url || "";
        return encodeURI(previousPinTarget);
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
    apply: async (str: string) => {
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
   * Placeholder for output of an AppleScript script. If the script fails, this placeholder will be replaced with an empty string. No sanitization is done in the script input; the expectation is that users will only use this placeholder with trusted scripts.
   */
  "{{(as|AS):(.|[ \\n\\r\\s])*?}}": {
    name: "AppleScript",
    rules: [],
    apply: async (str: string) => {
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
    apply: async (str: string) => {
      try {
        const script = str.match(/(?<=(jxa|JXA):)(.|[ \n\r\s])*?(?=}})/)?.[0];
        if (!script) return "";
        return execSync(
          `osascript -l JavaScript -e "${script
            .replaceAll('"', '\\"')
            .replaceAll("$", "\\$")
            .replaceAll(new RegExp(/[\n\r]/, "g"), "; ")}"`
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
    apply: async (str: string) => {
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
    apply: async (str: string) => {
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
              `{{date${format ? ` format="${format}"` : ""}}}`
            ),
          time: async () => await Placeholders.allPlaceholders[`{{time( format=("|').*?("|'))?}}`].apply("{{time}}"),
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
        };
        return await vm.runInNewContext(script, sandbox, { timeout: 1000, displayErrors: true });
      } catch (e) {
        return "";
      }
    },
  },
};

/**
 * Applies placeholders to a single string.
 * @param str The string to apply placeholders to.
 * @returns The string with placeholders applied.
 */
const applyToString = async (str: string) => {
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
          subbedStr = subbedStr.replace(new RegExp(alias), await placeholder.apply(subbedStr));
        }
      }
    } else {
      while (subbedStr.match(new RegExp(key, "g")) != undefined) {
        subbedStr = subbedStr.replace(new RegExp(key), await placeholder.apply(subbedStr));
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
const applyToStrings = async (strs: string[]) => {
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
const applyToObjectValueWithKey = async (obj: { [key: string]: unknown }, key: string) => {
  const value = obj[key];
  if (typeof value === "string") {
    return await applyToString(value);
  } else if (Array.isArray(value)) {
    return await applyToStrings(value);
  } else if (typeof value === "object") {
    return await applyToObjectValuesWithKeys(
      value as { [key: string]: unknown },
      Object.keys(value as { [key: string]: unknown })
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
const applyToObjectValuesWithKeys = async (obj: { [key: string]: unknown }, keys: string[]) => {
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
