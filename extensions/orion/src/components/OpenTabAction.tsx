import { closeMainWindow, Icon, Action } from "@raycast/api";

import { Tab } from "../types";
import { closeLauncherTabs, executeJxa, getOrionAppIdentifier } from "../utils";

const activateTab = async (tab: Tab) =>
  executeJxa(`
    const orion = Application("${getOrionAppIdentifier()}");
    const window = orion.windows.byId(${tab.window_id});
    const urls = window.tabs.url();
    const names = window.tabs.name();
    const targetUrl = String.raw\`${tab.url}\`;
    const targetName = String.raw\`${tab.title}\`;
    let index = -1;
    for (let i = 0; i < urls.length; i++) {
      if (urls[i] === targetUrl && names[i] === targetName) {
        index = i;
        break;
      }
    }
    if (index !== -1) {
      window.index = 1;
      window.currentTab = window.tabs[index];
      orion.activate();
    }
  `);

const OpenTabAction = (props: { tab: Tab }) => {
  const { tab } = props;
  return (
    <Action
      title="Open in Browser"
      icon={Icon.Globe}
      onAction={async () => {
        // Close launcher tabs BEFORE activating Orion. If a raycast:// tab is
        // still present when Orion comes to the front, it re-commits its pending
        // deeplink navigation and the palette reopens.
        await closeLauncherTabs();
        await activateTab(tab);
        await closeMainWindow({ clearRootSearch: true });
      }}
    />
  );
};

export default OpenTabAction;
