import { Action, ActionPanel, List, Icon, showToast, Toast, getPreferenceValues } from "@raycast/api";
import { getFavicon } from "@raycast/utils";
import { useEffect, useState } from "react";
import { getInstalledBrowsers, Browser } from "./utils/browsers";
import { loadRules, getDefaultBrowser, setDefaultBrowser } from "./storage";
import { generateFinickyConfig, writeConfigFile } from "./utils/finicky";
import { expandTilde } from "./utils/path";

async function syncConfigFile(args: { configPath: string; defaultBrowser: string }) {
  const rules = await loadRules();
  const configPath = expandTilde(args.configPath);
  const contents = generateFinickyConfig({ defaultBrowser: args.defaultBrowser, rules });
  await writeConfigFile({ configPath, configContents: contents });
}

export default function Command() {
  const [installedBrowsers, setInstalledBrowsers] = useState<Browser[]>([]);
  const [currentDefaultBrowser, setCurrentDefaultBrowser] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  const preferences = getPreferenceValues<{ configPath?: string }>();
  const configPath = (preferences.configPath ?? "").trim();

  useEffect(() => {
    async function loadData() {
      try {
        const [browsers, defaultBrowser] = await Promise.all([getInstalledBrowsers(), getDefaultBrowser()]);
        setInstalledBrowsers(browsers);
        setCurrentDefaultBrowser(defaultBrowser);
      } catch (error) {
        console.error("Failed to load data:", error);
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, []);

  async function handleSetDefault(browser: Browser) {
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Updating default browser...",
      message: `Setting to ${browser.name}`,
    });

    try {
      await setDefaultBrowser(browser.name);
      setCurrentDefaultBrowser(browser.name);

      if (configPath) {
        toast.message = "Updating config file...";
        await syncConfigFile({ configPath, defaultBrowser: browser.name });

        toast.style = Toast.Style.Success;
        toast.title = "✓ Default browser updated";
        toast.message = `${browser.name} is now your default browser`;
      } else {
        toast.style = Toast.Style.Success;
        toast.title = "✓ Default browser updated";
        toast.message = `${browser.name} is now your default (config path not set)`;
      }
    } catch (error) {
      console.error("Error updating default browser:", error);
      toast.style = Toast.Style.Failure;
      toast.title = "✗ Failed to update default browser";
      toast.message = error instanceof Error ? error.message : String(error);
    }
  }

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search browsers...">
      {installedBrowsers.map((browser) => {
        const isDefault = browser.name === currentDefaultBrowser;
        return (
          <List.Item
            key={browser.bundleId}
            title={browser.name}
            icon={
              browser.appPath
                ? { fileIcon: browser.appPath }
                : browser.homepage
                  ? getFavicon(browser.homepage, { fallback: Icon.AppWindow })
                  : Icon.AppWindow
            }
            accessories={[...(isDefault ? [{ icon: Icon.CheckCircle, tooltip: "Current Default" }] : [])]}
            actions={
              <ActionPanel>
                <Action
                  title="Set as Default Browser"
                  icon={Icon.CheckCircle}
                  onAction={async () => {
                    await handleSetDefault(browser);
                  }}
                />
              </ActionPanel>
            }
          />
        );
      })}

      {installedBrowsers.length === 0 && !isLoading && (
        <List.EmptyView
          title="No browsers detected"
          description="Make sure you have browsers installed on your system."
          icon={Icon.AppWindow}
        />
      )}
    </List>
  );
}
