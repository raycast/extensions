import { closeMainWindow, getPreferenceValues, popToRoot } from "@raycast/api";
import { exec } from "child_process";
import { promisify } from "util";
import { Preferences, Tab } from "../interfaces";
import { SEARCH_ENGINE } from "../constants";

const execAsync = promisify(exec);

export async function openNewTab(queryText: string | null | undefined): Promise<boolean | string> {
  popToRoot();
  closeMainWindow({ clearRootSearch: true });

  const preferences = getPreferenceValues<Preferences>();
  const browserApp = preferences.browserApp || "Firefox";

  if (queryText) {
    const searchEngine = preferences.searchEngine?.toLowerCase() || "google";
    const searchUrl = SEARCH_ENGINE[searchEngine] || SEARCH_ENGINE["google"];
    const fullUrl = `${searchUrl}${encodeURIComponent(queryText)}`;
    const command = `open -a "${browserApp}" "${fullUrl}"`;

    const { stdout } = await execAsync(command);
    return stdout || "success";
  } else {
    const command = `open -a "${browserApp}" "about:newtab"`;

    const { stdout } = await execAsync(command);
    return stdout || "success";
  }
}

export async function openHistoryTab(url: string): Promise<boolean | string> {
  popToRoot();
  closeMainWindow({ clearRootSearch: true });

  const preferences = getPreferenceValues<Preferences>();
  const browserApp = preferences.browserApp || "Firefox";
  const command = `open -a "${browserApp}" "${url}"`;

  const { stdout } = await execAsync(command);
  return stdout || "success";
}

export async function setActiveTab(tab: Tab): Promise<void> {
  const preferences = getPreferenceValues<Preferences>();
  const browserApp = preferences.browserApp || "Firefox";

  // Instead of trying to find and activate the existing tab,
  // just open the URL which is more reliable and simpler
  const command = `open -a "${browserApp}" "${tab.url}"`;
  await execAsync(command);
}
