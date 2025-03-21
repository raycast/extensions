import { BrowserExtension, environment } from "@raycast/api";

export function isExtensionInstalled() {
  return environment.canAccess(BrowserExtension);
}

export async function getActiveTab() {
  try {
    const tabs = await BrowserExtension.getTabs();
    const tab = tabs.find((tab) => tab.active);
    return tab;
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
  } catch (error: unknown) {
    return undefined;
  }
}

export async function getTabs() {
  try {
    const tabs = await BrowserExtension.getTabs();
    return tabs;
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
  } catch (error: unknown) {
    return [];
  }
}
