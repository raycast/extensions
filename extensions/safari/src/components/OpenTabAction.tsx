import { Action, closeMainWindow, Icon } from "@raycast/api";
import { runAppleScript } from "@raycast/utils";
import { LocalTab, Tab } from "../types";
import { safariAppIdentifier } from "../utils";

async function activateLocalTab(tab: LocalTab) {
  const script = `
    tell application "${safariAppIdentifier}"
      set windowID to ${tab.window_id}
      set tabID to ${tab.index}
      set windowObj to window id windowID
      set tabObj to tab tabID of windowObj
      set index of windowObj to 1
      set current tab of windowObj to tabObj
      activate
    end tell
  `;

  await runAppleScript(script);
}

export default function OpenTabAction(props: { tab: Tab }) {
  const { tab } = props;

  return tab.is_local ? (
    <Action
      title="Open in Browser"
      icon={Icon.Globe}
      onAction={async () => {
        await activateLocalTab(tab as LocalTab);
        await closeMainWindow({ clearRootSearch: true });
      }}
    />
  ) : (
    <Action.OpenInBrowser url={tab.url} />
  );
}
