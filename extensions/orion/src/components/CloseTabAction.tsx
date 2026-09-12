import { Icon, Action } from "@raycast/api";

import { Tab } from "../types";
import { executeJxa, getOrionAppIdentifier } from "../utils";

const closeTab = async (tab: Tab) =>
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
      window.tabs[index].close();
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
