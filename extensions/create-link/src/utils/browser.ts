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
    console.debug(error);
    return undefined;
  }
}

export async function getTabs() {
  try {
    const tabs = await BrowserExtension.getTabs();
    return tabs;
  } catch (error: unknown) {
    console.debug(error);
    return [];
  }
}
