import { BrowserExtension, environment } from "@raycast/api";

export async function getArgumentOrCurrentTabUrl(value?: string): Promise<string> {
  const trimmedValue = value?.trim();
  if (trimmedValue) {
    return trimmedValue;
  }

  if (!environment.canAccess(BrowserExtension)) {
    throw new Error("No URL provided. Install the Raycast Browser Extension to use the current browser tab.");
  }

  try {
    const activeTab = (await BrowserExtension.getTabs()).find((tab) => tab.active);

    if (!activeTab?.url) {
      throw new Error("Could not find an active browser tab URL.");
    }

    return activeTab.url;
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }

    throw new Error("Could not read the current browser tab. Make sure the Raycast Browser Extension is installed.");
  }
}
