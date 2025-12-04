import { runAppleScript } from "@raycast/utils";
import { keyToAppleScriptCode, modifiers, supportedBrowsers } from "./constants";
import { idToCommandMap } from "./mock";
import { ApplicationShortcut, IFormValues, Key, Modifier, ShortcutToRun, WebShortcut } from "./types";

type RunShortcutParams = {
  appName: string;
  key: ShortcutToRun["key"];
  modifiers: ShortcutToRun["modifiers"];
};

export const runShortcut = async ({ key, appName, modifiers }: RunShortcutParams): Promise<null> => {
  const appleScriptKeyCode = keyToAppleScriptCode[key];
  const modifierString = modifiers
    .filter(Boolean)
    .map((modifier) => `${modifier} down`)
    .join(", ");
  console.log({ appleScriptKeyCode, modifierString });
  await runAppleScript(`
        tell application "${appName}" to activate
        tell application "System Events"
            key code ${appleScriptKeyCode} ${modifierString ? `using {${modifierString}}` : ""}
        end tell
    `);
  return null;
};

export async function getActiveTabUrl(browser: string): Promise<URL | null> {
  const script =
    browser === "Safari"
      ? `
        tell application "Safari"
            if it is running then
                get URL of front document
            end if
        end tell
    `
      : `
        tell application "${browser}"
            if it is running then
                get URL of active tab of front window
            end if
        end tell
    `;
  try {
    const url = await runAppleScript(script);

    if (!url) {
      return null;
    }

    return new URL(url);
  } catch (error) {
    return null;
  }
}

export function doesMatchUrl(testUrl: URL, websiteUrl: string): boolean {
  return testUrl.href.includes(websiteUrl);
}

export function isCurrentAppBrowser({
  frontmostApplicationName,
  preferenceBrowserName,
}: {
  frontmostApplicationName: string;
  preferenceBrowserName: string;
}) {
  return supportedBrowsers.includes(frontmostApplicationName) || preferenceBrowserName === frontmostApplicationName;
}

export function compareIsAppMatches({
  shortcut,
  activeTabUrl,
  frontmostApplicationName,
}: {
  shortcut: ApplicationShortcut | WebShortcut;
  activeTabUrl: URL | null;
  frontmostApplicationName: string;
}): boolean {
  if (shortcut.type === "web" && activeTabUrl) {
    const doesMatchPattern = doesMatchUrl(activeTabUrl, shortcut.websiteUrl);
    return doesMatchPattern;
  }
  if (shortcut.type === "app") {
    return frontmostApplicationName === shortcut.applicationName;
  }
  return false;
}

const isModifier = (val: unknown): val is Modifier => {
  return typeof val === "string" && modifiers.includes(val as Modifier);
};

const isKey = (val: unknown): val is Key => {
  return typeof val === "string" && Object.keys(keyToAppleScriptCode).includes(val);
};

const isValidShortcut = (shortcut: string[]): boolean => shortcut.filter(isKey).length === 1;

export const validateFormValues = ({ commandName, apps, urls, ...shortcuts }: IFormValues): Record<string, string> => {
  const errors: Record<string, string> = {};

  if (!commandName) {
    errors.commandName = "provide command name";
  }

  if (apps.length === 0 && !urls) {
    errors.apps = "app or url required";
    errors.urls = "app or url required";
  }

  Object.keys(shortcuts).forEach((appOrUrl) => {
    if (shortcuts[appOrUrl].length === 0) {
      errors[appOrUrl] = "provide shortcut";
    } else if (!isValidShortcut(shortcuts[appOrUrl])) {
      errors[appOrUrl] = "exactly one key required";
    }
  });

  return errors;
};

const parseShortcuts = (shortcut: string[]) => {
  const parsedShortcuts = shortcut.reduce<{ shortcutModifiers: Modifier[]; shortcutKey: Key | null }>(
    (acc, curr) => {
      if (isModifier(curr)) {
        acc.shortcutModifiers.push(curr);
      }

      if (isKey(curr)) {
        acc.shortcutKey = curr;
      }

      return acc;
    },
    { shortcutModifiers: [] as Modifier[], shortcutKey: null },
  );

  return parsedShortcuts;
};

export const getAppShortcuts = (values: IFormValues) => {
  const appShortcuts = values.apps.map<ApplicationShortcut>((app) => {
    const { shortcutModifiers, shortcutKey } = parseShortcuts(values[app]);

    return {
      type: "app",
      applicationName: app,
      shortcutToRun: { modifiers: shortcutModifiers, key: shortcutKey! },
    };
  });

  return appShortcuts;
};

export const getUrlShortcuts = (values: IFormValues) => {
  const urlShortcuts = values.urls
    .split(" ")
    .filter(Boolean)
    .map<WebShortcut>((url) => {
      const { shortcutModifiers, shortcutKey } = parseShortcuts(values[url]);

      return {
        type: "web",
        websiteUrl: url,
        shortcutToRun: { modifiers: shortcutModifiers, key: shortcutKey! },
      };
    });

  return urlShortcuts;
};

export const isPredefinedCommand = (id: string) => !!idToCommandMap[id];
