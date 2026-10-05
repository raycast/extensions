import { Icon, Action } from "@raycast/api";

import { Tab } from "../types";
import { executeJxa, getOrionAppIdentifier } from "../utils";

const closeTab = async (tab: Tab) =>
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
    // have swapped positions since the last refresh, and closing the wrong
    // one is unrecoverable, so an ambiguous match closes nothing.
    if (urls[index] !== targetUrl || names[index] !== targetName) {
      const matches = [];
      for (let i = 0; i < urls.length; i++) {
        if (urls[i] === targetUrl && names[i] === targetName) matches.push(i);
      }
      index = matches.length === 1 ? matches[0] : -1;
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
