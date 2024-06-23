import { closeMainWindow, getFrontmostApplication, getPreferenceValues, LocalStorage, showHUD } from "@raycast/api";
import { doesMatchUrl, getActiveTabUrl, isCurrentAppBrowser, runShortcut } from "./utils";
import { idToCommandMap } from "./mock";
import { CommandRecord, ShortcutToRun } from "./types";

export default async function main({ arguments: { id } }: { arguments: { id: string } }) {
  const frontmostApplication = await getFrontmostApplication();
  const { name: frontmostApplicationName } = frontmostApplication;
  const { browser } = getPreferenceValues();

  console.log({ id });

  const applicationCommandRecordMocked = idToCommandMap[id];

  let applicationCommandRecord: CommandRecord = applicationCommandRecordMocked;

  if (!applicationCommandRecord) {
    const commandRaw = await LocalStorage.getItem<string>(id);

    if (commandRaw) {
      applicationCommandRecord = JSON.parse(commandRaw);
    }
  }

  if (!applicationCommandRecord) {
    await showHUD(`Command with id "${id}" wasn't found`);
    return;
  }

  let shortcutToRun: ShortcutToRun | null = null;
  let metaActiveTabUrl: string | null = null;

  if (isCurrentAppBrowser({ frontmostApplicationName, preferenceBrowserName: browser?.name || "" })) {
    const activeTabUrl = await getActiveTabUrl(frontmostApplicationName);

    if (activeTabUrl) {
      const foundShorcut = applicationCommandRecord.shortcuts.find((shorcutObject) => {
        if (shorcutObject.type === "app") {
          return false;
        }
        const doesMatchPattern = doesMatchUrl(activeTabUrl, shorcutObject.websiteUrl);
        return doesMatchPattern;
      });
      if (foundShorcut) {
        shortcutToRun = foundShorcut.shortcutToRun;
        metaActiveTabUrl = activeTabUrl.href;
      }
    }
  }

  if (!shortcutToRun) {
    const foundShortcut = applicationCommandRecord.shortcuts.find((shorcutObject) => {
      if (shorcutObject.type === "web") {
        return false;
      }
      return frontmostApplicationName === shorcutObject.applicationName;
    });
    if (foundShortcut) {
      shortcutToRun = foundShortcut.shortcutToRun;
    }
  }

  if (!shortcutToRun) {
    return await showHUD(
      `No shortcut was found for application "${frontmostApplicationName}" for command "${applicationCommandRecord.name}"`,
    );
  }
  await closeMainWindow();
  await runShortcut({ ...shortcutToRun, appName: frontmostApplicationName });
  // todo remove hud in case of success.
  const resultText = `${applicationCommandRecord.name} in ${metaActiveTabUrl || frontmostApplicationName}`;
  await showHUD(resultText);
}
