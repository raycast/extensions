import { Action, Icon } from "@raycast/api";
import { runAppleScript } from "@raycast/utils";
import { LocalTab, Tab } from "../types";
import { safariAppIdentifier } from "../utils";

async function closeLocalTab(tab: LocalTab) {
  const script = `
    tell application "${safariAppIdentifier}"
      set windowID to ${tab.window_id}
      set tabID to ${tab.index}
      tell window id windowID
        close tab tabID
      end tell
    end tell
  `;

  await runAppleScript(script);
}

export default function CloseLocalTabAction(props: { tab: Tab; refresh: () => void }) {
  return props.tab.is_local ? (
    <Action
      title="Close Tab"
      icon={Icon.XMarkCircle}
      shortcut={{ modifiers: ["ctrl"], key: "x" }}
      onAction={async () => {
        await closeLocalTab(props.tab as LocalTab);
        props.refresh();
      }}
    />
  ) : null;
}
