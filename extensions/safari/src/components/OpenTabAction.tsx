import { ActionPanel, closeMainWindow, Icon, OpenInBrowserAction } from "@raycast/api";

import { LocalTab, Tab } from "../types";
import { executeJxa } from "../utils";

const activateLocalTab = async (tab: LocalTab) =>
  executeJxa(`
      const safari = Application("Safari");
      const window = safari.windows.byId(${tab.window_id});
      const tab = window.tabs[${tab.index - 1}];
      window.index = 1;
      window.currentTab = tab;
      safari.activate();
  `);

const OpenTabAction = (props: { tab: Tab }) => {
  const { tab } = props;
  return tab.is_local ? (
    <ActionPanel.Item
      title="Open in Browser"
      icon={Icon.Globe}
      onAction={async () => {
        await activateLocalTab(tab as LocalTab);
        await closeMainWindow({ clearRootSearch: true });
      }}
    />
  ) : (
    <OpenInBrowserAction url={tab.url} />
  );
};

export default OpenTabAction;
