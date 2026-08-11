import { BrowserExtension, environment } from "@raycast/api"

export async function getRepoIdentifierFromArgumentOrCurrentTab(repoIdentifier?: string): Promise<string> {
  const trimmedRepoIdentifier = repoIdentifier?.trim()
  if (trimmedRepoIdentifier) {
    return trimmedRepoIdentifier
  }

  if (!environment.canAccess(BrowserExtension)) {
    throw new Error("No repository provided. Install the Raycast Browser Extension to use the current browser tab URL.")
  }

  try {
    const activeTab = (await BrowserExtension.getTabs()).find((tab) => tab.active)

    if (!activeTab?.url) {
      throw new Error("Could not find an active browser tab URL.")
    }

    return activeTab.url
  } catch (error) {
    if (error instanceof Error && error.message) {
      throw error
    }

    throw new Error("Could not read the current browser tab. Make sure the Raycast Browser Extension is installed.")
  }
}
