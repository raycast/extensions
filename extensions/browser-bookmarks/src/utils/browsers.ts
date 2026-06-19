import { getDefaultApplication } from "@raycast/api";

import { BrowserApplication, getBrowserIdForApplication, listAvailableBrowsers } from "../hooks/useAvailableBrowsers";

export async function getDefaultBrowserId(availableBrowsers?: BrowserApplication[]) {
  const resolvedBrowsers = availableBrowsers ?? (await listAvailableBrowsers());

  if (resolvedBrowsers.length === 0) {
    return "";
  }

  if (resolvedBrowsers.length === 1) {
    return resolvedBrowsers[0].browserId;
  }

  try {
    const defaultApplication = await getDefaultApplication("https://raycast.com");
    const browserId = getBrowserIdForApplication(defaultApplication);

    if (browserId) {
      return browserId;
    }
  } catch {
    // Fall back to the first available browser if the system default cannot be resolved.
  }

  return resolvedBrowsers[0].browserId;
}

export async function getInitialBrowserSelection(availableBrowsers?: BrowserApplication[]) {
  const resolvedBrowsers = availableBrowsers ?? (await listAvailableBrowsers());

  if (resolvedBrowsers.length === 0) {
    return [];
  }

  if (process.platform === "win32") {
    return resolvedBrowsers.map((browser) => browser.browserId);
  }

  const defaultBrowserId = await getDefaultBrowserId(resolvedBrowsers);
  return defaultBrowserId ? [defaultBrowserId] : [];
}
