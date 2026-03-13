import { getPreferenceValues, BrowserExtension, showToast, Toast, LocalStorage, open } from "@raycast/api";
import { loadConfig, type Config } from "./config";
import path from "path";

function lookupAppDir(config: Config, hostname: string): string | null {
  for (const [app, appConfig] of Object.entries(config.apps ?? {})) {
    if (appConfig.additionalDomains?.includes(hostname)) {
      return path.join(config.dir, app);
    }
  }

  const [app, ...parts] = hostname.split(".");
  const domain = parts.join(".");
  if (config.domain === domain) {
    return path.join(config.dir, app);
  }

  for (const additionalDomain of config.additionalDomains ?? []) {
    if (additionalDomain == domain) {
      return path.join(config.dir, app);
    }
  }

  return null;
}

const preferences = getPreferenceValues<Preferences.OpenApp>();
export default async function () {
  const dirs = JSON.parse((await LocalStorage.getItem<string>("dirs")) || "[]") as string[];
  if (!dirs) {
    await showToast({ title: "No dirs found", style: Toast.Style.Failure });
    return;
  }

  let tabs: BrowserExtension.Tab[];
  try {
    tabs = await BrowserExtension.getTabs();
  } catch (error) {
    await showToast({ title: "Failed to access browser tabs", style: Toast.Style.Failure });
    return;
  }
  const selectedTab = tabs.find((tab) => tab.active);
  if (!selectedTab) {
    await showToast({ title: "No active tab", style: Toast.Style.Failure });
    return;
  }

  const url = new URL(selectedTab.url);

  const configs = await Promise.all(dirs.map(async (dir) => loadConfig(dir)));
  for (const config of configs) {
    const dir = lookupAppDir(config, url.hostname);
    if (dir) {
      try {
        await open(dir, preferences.editor);
      } catch (error) {
        await showToast({ title: "Failed to open directory", style: Toast.Style.Failure });
      }
      return;
    }
  }

  await showToast({ title: `Active tab is not a smallweb app`, style: Toast.Style.Failure });
  return;
}
