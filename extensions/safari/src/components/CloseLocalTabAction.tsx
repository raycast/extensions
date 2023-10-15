import { Icon, Action } from "@raycast/api";

import { LocalTab, Tab } from "../types";
import { executeJxa, safariAppIdentifier } from "../utils";

const closeLocalTab = async (tab: LocalTab) =>
  executeJxa(`
    const safari = Application("${safariAppIdentifier}");
    const window = safari.windows.byId(${tab.window_id});
    const tab = window.tabs[${tab.index - 1}];
    tab.close();
`);

const CloseLocalTabAction = (props: { tab: Tab; refresh: () => void }) => {
  return props.tab.is_local ? (
    <Action
      title="Close Tab"
      icon={Icon.XmarkCircle}
      shortcut={{ modifiers: ["ctrl"], key: "x" }}
      onAction={async () => {
        await closeLocalTab(props.tab as LocalTab);
        props.refresh();
      }}
    />
  ) : null;
};

export default CloseLocalTabAction;
