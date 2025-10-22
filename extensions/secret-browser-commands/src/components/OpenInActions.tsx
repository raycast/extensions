import { Action, Icon, ActionPanel } from "@raycast/api";
import { SUPPORTED_BROWSERS } from "../types/browsers";
import { openUrlInBrowser } from "../utils/openUrlInBrowser";

interface OpenInBrowserSubmenuProps {
  commandPath: string; // Just the path, e.g., "settings"
  currentBrowser: string; // The 'key' of the currently selected browser
}

export function OpenInBrowserSubmenu({ commandPath, currentBrowser }: OpenInBrowserSubmenuProps) {
  // Find the current browser object
  const selectedBrowser = SUPPORTED_BROWSERS.find((b) => b.key === currentBrowser);

  // Get all browsers except the current one
  const otherBrowsers = SUPPORTED_BROWSERS.filter((browser) => browser.key !== currentBrowser);

  return (
    <ActionPanel.Submenu title="Open in…" icon={Icon.Globe}>
      {selectedBrowser && (
        <Action
          title={selectedBrowser.title}
          icon={Icon.Compass}
          onAction={() => openUrlInBrowser(selectedBrowser.appName!, `${selectedBrowser.scheme}${commandPath}`)}
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
