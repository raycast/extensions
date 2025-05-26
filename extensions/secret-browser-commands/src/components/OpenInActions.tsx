import { Action, Icon, getPreferenceValues, ActionPanel } from "@raycast/api";
import { SUPPORTED_BROWSERS } from "../types/browsers";
import { openUrlInBrowser } from "../utils/openUrlInBrowser";

interface OpenInBrowserSubmenuProps {
  commandPath: string; // Just the path, e.g., "settings"
  preferences: {
    preferredBrowser?: string; // The 'key' of the preferred browser from list item context
  };
}

export function OpenInBrowserSubmenu({ commandPath, preferences: propsPreferences }: OpenInBrowserSubmenuProps) {
  const { preferredBrowser: settingsPrefBrowserKey } = getPreferenceValues<Preferences>();
  const effectivePrefBrowserKey = propsPreferences.preferredBrowser || settingsPrefBrowserKey;

  // Find the preferred browser object if it's set
  const preferredBrowser = SUPPORTED_BROWSERS.find((b) => b.key === effectivePrefBrowserKey);

  // Get all browsers except the preferred one (if any)
  const otherBrowsers = SUPPORTED_BROWSERS.filter((browser) => browser.key !== effectivePrefBrowserKey);

  return (
    <ActionPanel.Submenu title="Open in…" icon={Icon.Globe}>
      {preferredBrowser && (
        <Action
          title={preferredBrowser.title}
          icon={Icon.Compass}
          onAction={() => openUrlInBrowser(preferredBrowser.appName!, `${preferredBrowser.scheme}${commandPath}`)}
        />
      )}

      {otherBrowsers.map((browser) => (
        <Action
          key={browser.key}
          title={browser.title}
          icon={Icon.Globe}
          onAction={() => openUrlInBrowser(browser.appName!, `${browser.scheme}${commandPath}`)}
        />
      ))}
    </ActionPanel.Submenu>
  );
}
