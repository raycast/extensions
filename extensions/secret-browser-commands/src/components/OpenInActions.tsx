import { Action, Icon, ActionPanel } from "@raycast/api";
import { Browser, SUPPORTED_BROWSERS } from "../types/browsers";
import { browserAppPath, browserIcon, InstalledBrowsers, isBrowserAvailable } from "../utils/browserApps";
import { buildBrowserUrl } from "../utils/browserUrl";
import { LaunchedCommand, openUrlInBrowser } from "../utils/openUrlInBrowser";

interface OpenInBrowserSubmenuProps {
  commandPath: string; // Just the path, e.g., "settings"
  currentBrowser: string; // The 'key' of the currently selected browser
  /** Browser keys that actually serve this URL. */
  supportedBrowsers: string[];
  /**
   * Browser key → installed app path. `undefined` while discovery is still running, which is not
   * the same as "nothing installed" — see isBrowserAvailable.
   */
  installedBrowsers: InstalledBrowsers | undefined;
  /** The command being launched. The launcher decides from this whether to confirm first. */
  command: LaunchedCommand;
}

export function OpenInBrowserSubmenu({
  commandPath,
  currentBrowser,
  supportedBrowsers,
  installedBrowsers,
  command,
}: OpenInBrowserSubmenuProps) {
  const selectedBrowser = SUPPORTED_BROWSERS.find((b) => b.key === currentBrowser);

  // A browser is offered only if all three hold: we can name an app to launch, it serves this URL,
  // and it is installed. The same three are applied to the selected browser and to every other one,
  // so the submenu cannot contradict itself.
  const isLaunchable = (browser: Browser): browser is Browser & { appName: string } => Boolean(browser.appName);
  const serves = (browser: Browser) => supportedBrowsers.includes(browser.key);
  const available = (browser: Browser) => isBrowserAvailable(installedBrowsers, browser.key);
  const canOffer = (browser: Browser): browser is Browser & { appName: string } =>
    isLaunchable(browser) && serves(browser) && available(browser);

  const otherBrowsers = SUPPORTED_BROWSERS.filter((browser) => browser.key !== currentBrowser).filter(canOffer);
  const showSelected = selectedBrowser !== undefined && canOffer(selectedBrowser);

  // An empty submenu is a dead end. Render nothing rather than a menu with no items.
  if (!showSelected && otherBrowsers.length === 0) return null;

  const launch = (browser: Browser & { appName: string }) =>
    openUrlInBrowser(
      // Prefer the discovered bundle path so we open the app whose icon we just showed.
      { app: browserAppPath(installedBrowsers, browser.key) ?? browser.appName, name: browser.title },
      buildBrowserUrl(browser.scheme, commandPath),
      command,
    );

  return (
    <ActionPanel.Submenu title="Open in…" icon={Icon.Globe}>
      {showSelected && (
        <Action
          title={selectedBrowser.title}
          icon={browserIcon(selectedBrowser, installedBrowsers)}
          onAction={() => launch(selectedBrowser)}
        />
      )}

      {otherBrowsers.map((browser) => (
        <Action
          key={browser.key}
          title={browser.title}
          icon={browserIcon(browser, installedBrowsers)}
          onAction={() => launch(browser)}
        />
      ))}
    </ActionPanel.Submenu>
  );
}
