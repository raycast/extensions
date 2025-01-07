import { Alert, confirmAlert, Icon, LocalStorage } from "@raycast/api";
import { BadgerApplication, sortApps } from "./apps.ts";
import useScripts from "./scripts.ts";
import useExtension from "./extension.ts";

function useStorage() {
  const { getPreferences } = useExtension();
  const preferences = getPreferences();

  async function getApps(enabled: boolean = false): Promise<BadgerApplication[]> {
    const storage = await LocalStorage.allItems();
    let apps: BadgerApplication[] = storage.apps ? JSON.parse(storage.apps) : [];

    if (enabled) apps = apps.filter((app) => app.enabled);
    if (preferences.disableInactive) {
      const { isOpen } = useScripts();
      await Promise.all(
        apps.map(async (app) => {
          app.active = await isOpen(app);
        }),
      );
      if (enabled) apps = apps.filter((app) => app.active);
    }

    return sortApps(apps);
  }

  async function saveApp(app: BadgerApplication) {
    let apps = await getApps();
    if (!apps.filter((appItem) => appItem.bundleId === app.bundleId).length) apps.push(app);
    else apps = (await getApps()).map((appItem) => (appItem.bundleId === app.bundleId ? app : appItem));
    await LocalStorage.setItem("apps", JSON.stringify(apps));
  }

  async function removeApp(app?: BadgerApplication) {
    let apps = await getApps();

    if (app) {
      apps = apps.filter((appItem) => appItem.bundleId !== app.bundleId);
    } else if (
      await confirmAlert({
        title: "Do you want to remove all badges?",
        icon: Icon.ExclamationMark,
        primaryAction: {
          title: "Remove",
          style: Alert.ActionStyle.Destructive,
        },
      })
    ) {
      await LocalStorage.removeItem("apps");
      apps = [];
    }

    await LocalStorage.setItem("apps", JSON.stringify(apps));
  }

  return { getApps, saveApp, removeApp };
}

export default useStorage;
