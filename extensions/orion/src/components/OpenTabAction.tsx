import { closeMainWindow, Icon, Action, PopToRootType } from "@raycast/api";

import { Tab } from "../types";
import { closeLauncherTabs, executeJxa, getOrionAppIdentifier } from "../utils";

const activateTab = async (tab: Tab) =>
  executeJxa(`
    const orion = Application("${getOrionAppIdentifier()}");
    const window = orion.windows.byId(${tab.window_id});
    const urls = window.tabs.url();
    const names = window.tabs.name();
    const targetUrl = ${JSON.stringify(tab.url)};
    const targetName = ${JSON.stringify(tab.title)};
    let index = ${tab.tab_index};
    // The index preserves duplicate URL instances. If a tab changed or closed
    // between refresh and action, retain the previous title/URL fallback -
    // but only when exactly one tab still matches. Two identical tabs could
    // have swapped positions since the last refresh, so an ambiguous match
    // activates nothing rather than guessing the wrong instance.
    if (urls[index] !== targetUrl || names[index] !== targetName) {
      const matches = [];
      for (let i = 0; i < urls.length; i++) {
        if (urls[i] === targetUrl && names[i] === targetName) matches.push(i);
      }
      index = matches.length === 1 ? matches[0] : -1;
    }
    if (index !== -1) {
      window.index = 1;
      window.currentTab = window.tabs[index];
      orion.activate();
    }
  `);

// `closeLaunchers` and `immediatePopToRoot` are both opt-in (the Command Bar
// passes them) so the standalone "Search Tabs" command neither makes an extra
// AppleScript call on every open, nor stops respecting the user's Pop to Root
// Search preference - only the Command Bar's background poll depends on
// always tearing down immediately after a result opens.
const OpenTabAction = (props: {
  tab: Tab;
  closeLaunchers?: boolean;
  immediatePopToRoot?: boolean;
  onActivate?: (tab: Tab) => void;
}) => {
  const { tab, closeLaunchers, immediatePopToRoot, onActivate } = props;
  return (
    <Action
      title="Open in Browser"
      icon={Icon.Globe}
      onAction={async () => {
        // Close launcher tabs BEFORE activating Orion. If a raycast:// tab is
        // still present when Orion comes to the front, it re-commits its pending
        // deeplink navigation and the palette reopens.
        if (closeLaunchers) {
          await closeLauncherTabs();
        }
        await activateTab(tab);
        // The tabs cache only learns this switch from its next AppleScript
        // refresh. Update it locally right away so a Command Bar reopened
        // before that refresh completes already shows `tab` as current.
        onActivate?.(tab);
        // Opening a result completes this Command Bar interaction. Return to
        // root immediately so the next hotkey starts a fresh command session,
        // independent of the user's delayed Pop to Root Search preference -
        // otherwise a lingering session can resume without noticing a tab
        // opened or closed directly in Orion in the meantime.
        await closeMainWindow({
          clearRootSearch: true,
          ...(immediatePopToRoot ? { popToRootType: PopToRootType.Immediate } : {}),
        });
      }}
    />
  );
};

export default OpenTabAction;
