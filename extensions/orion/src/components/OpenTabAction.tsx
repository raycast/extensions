import { closeMainWindow, Icon, Action } from "@raycast/api";

import { Tab } from "../types";
import { executeJxa, getOrionAppIdentifier } from "../utils";

const activateTab = async (tab: Tab) =>
  executeJxa(`
    const orion = Application("${getOrionAppIdentifier()}");
    const window = orion.windows.byId(${tab.window_id});
    const tab = window.tabs().find(tab => tab.url() === String.raw\`${tab.url}\` && tab.name() === String.raw\`${
      tab.title
    }\`);
    if (tab) {
      window.index = 1;
      window.currentTab = tab;
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
        await activateTab(tab);
        await closeMainWindow({ clearRootSearch: true });
      }}
    />
  );
};

export default OpenTabAction;
