import { BrowserExtension, environment } from "@raycast/api";

export function isExtensionInstalled() {
  return environment.canAccess(BrowserExtension);
}

export async function getActiveTab() {
  try {
    const tabs = await BrowserExtension.getTabs();
    const tab = tabs.find((tab) => tab.active);
    return tab;
  } catch (error: unknown) {
    if (error instanceof Error) {
      throw new Error(`Failed to get active tab: ${error.message}`);
    } else {
      throw new Error(`Failed to get active tab: unknown error`);
    }
  }
}
