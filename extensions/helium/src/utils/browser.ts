import { BrowserExtension, environment, showToast, Toast, open } from "@raycast/api";
import { Tab } from "../types";

/**
 * Check if Browser Extension is available
 */
export function isBrowserExtensionAvailable(): boolean {
  return environment.canAccess(BrowserExtension);
}

/**
 * Get all open tabs from the browser using the Browser Extension API
 */
export async function getBrowserTabs(): Promise<Tab[]> {
  if (!isBrowserExtensionAvailable()) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Browser Extension Not Available",
      message: "Please install the Raycast Browser Extension",
    });
    return [];
  }

  try {
    const tabs = await BrowserExtension.getTabs();
    return tabs;
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Failed to Get Tabs",
      message: error instanceof Error ? error.message : "Unknown error occurred",
    });
    return [];
  }
}

/**
 * Get tabs filtered by browser (optional)
 * You can filter for specific browsers if needed
 */
export async function getTabsByBrowser(browserName?: string): Promise<Tab[]> {
  const allTabs = await getBrowserTabs();

  if (!browserName) {
    return allTabs;
  }

  // Filter tabs by browser if needed
  // The Browser Extension API returns tabs from all supported browsers
  return allTabs;
}

/**
 * Open a URL in the default browser or specific application
 */
export async function openUrl(url: string, application?: string): Promise<void> {
  try {
    await open(url, application);
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Failed to Open URL",
      message: error instanceof Error ? error.message : "Unknown error occurred",
    });
  }
}
