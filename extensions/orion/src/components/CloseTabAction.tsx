import { Icon, Action } from "@raycast/api";

import { Tab } from "../types";
import { executeJxa, getOrionAppIdentifier } from "../utils";

const closeTab = async (tab: Tab) =>
  executeJxa(`
    const orion = Application("${getOrionAppIdentifier()}");
    const window = orion.windows.byId(${tab.window_id});
    const tab = window.tabs().find(tab => tab.url() === String.raw\`${tab.url}\` && tab.name() === String.raw\`${
      tab.title
    }\`);
    if (tab) {
      tab.close();
    }
`);

const CloseTabAction = (props: { tab: Tab; refresh: () => void }) => {
  return (
    <Action
      title="Close Tab"
      icon={Icon.XMarkCircle}
      shortcut={{ modifiers: ["ctrl"], key: "x" }}
      onAction={async () => {
        await closeTab(props.tab as Tab);
        props.refresh();
      }}
    />
  );
};

export default CloseTabAction;
