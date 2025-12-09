import { showToast, Toast, LocalStorage, closeMainWindow, open } from "@raycast/api";
import { TabGroup } from "./manage-tab-groups";

const STORAGE_KEY = "tab-groups";

export default async function LaunchMorningEspresso() {
  try {
    // Close Raycast window immediately for a smoother experience
    await closeMainWindow();

    // Load groups from storage
    const stored = await LocalStorage.getItem<string>(STORAGE_KEY);

    if (!stored) {
      await showToast({
        style: Toast.Style.Failure,
        title: "No tab groups found",
        message: "Create some groups first in 'Manage Tab Groups'",
      });
      return;
    }

    const groups: TabGroup[] = JSON.parse(stored);
    const totalSites = groups.reduce((sum, g) => sum + g.sites.length, 0);

    if (totalSites === 0) {
      await showToast({
        style: Toast.Style.Failure,
        title: "No sites to open",
        message: "Add some sites to your groups first",
      });
      return;
    }

    // Show starting toast
    await showToast({
      style: Toast.Style.Animated,
      title: "Opening all tabs...",
      message: `${totalSites} tabs from ${groups.length} groups`,
    });

    // Open all tabs from all groups
    for (const group of groups) {
      for (const site of group.sites) {
        await open(site.url);
        // Small delay to prevent overwhelming the browser
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
    }

    // Show success toast
    await showToast({
      style: Toast.Style.Success,
      title: "Morning Espresso Ready! ☕",
      message: `Opened ${totalSites} tabs`,
    });
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Failed to launch",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
}
