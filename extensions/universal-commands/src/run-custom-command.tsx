import {
  closeMainWindow,
  getFrontmostApplication,
  getPreferenceValues,
  LocalStorage,
  popToRoot,
  showHUD,
} from "@raycast/api";
import { doesMatchUrl, getActiveTabUrl, isCurrentAppBrowser, runShortcut } from "./utils";
import { idToCommandMap } from "./mock";
import ManageCustomCommands from "./manage-custom-commands";

import { CommandRecord, ShortcutToRun } from "./types";
import { useEffect } from "react";

export default function Command({ arguments: { id } }: { arguments: { id: string } }) {
  useEffect(() => {
    if (!id) {
      return;
    }

    callCommand(id);
  }, []);

  if (!id) {
    return <ManageCustomCommands isRunPrimary />;
  }

  return null;
}

async function callCommand(id: string) {
  const frontmostApplication = await getFrontmostApplication();
  const { name: frontmostApplicationName } = frontmostApplication;
  const { browser } = getPreferenceValues();

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
    await showHUD(
      `No shortcut was found for application "${frontmostApplicationName}" for command "${applicationCommandRecord.name}"`,
    );
    await popToRoot();
    return null;
  }
  await closeMainWindow({
    clearRootSearch: true,
  });
  await runShortcut({ ...shortcutToRun, appName: frontmostApplicationName });
  // todo remove hud in case of success.
  const resultText = `${applicationCommandRecord.name} in ${metaActiveTabUrl || frontmostApplicationName}`;
  await showHUD(resultText);
  await popToRoot();
}
