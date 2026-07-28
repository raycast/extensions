import { Action, Icon } from "@raycast/api";
import { runAppleScript } from "@raycast/utils";
import { LocalTab, Tab } from "../types";
import { safariAppIdentifier } from "../utils";
import { getLocalTabApplicationTarget } from "../tab-utils";

function escapeAppleScriptString(value: string) {
  return value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

async function closeLocalTab(tab: LocalTab) {
  const appTarget = escapeAppleScriptString(getLocalTabApplicationTarget(tab, safariAppIdentifier));

  const script = `
    tell application "${appTarget}"
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
