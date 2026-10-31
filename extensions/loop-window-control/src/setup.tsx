import { Action, ActionPanel, Detail, getPreferenceValues, Icon, openExtensionPreferences } from "@raycast/api";
import { useEffect, useState } from "react";
import { LoopPreferences, sendRequest } from "./lib/loop";
import { inspectInstallation } from "./lib/transport";

export default function Setup() {
  const [status, setStatus] = useState("Checking installation…");
  const [loading, setLoading] = useState(true);
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    let active = true;
    setLoading(true);
    inspectInstallation(getPreferenceValues<LoopPreferences>().appPath)
      .then((info) => {
        if (active)
          setStatus(`Found Loop **${info.version}** with a declared loop:// URL scheme.\n\nPath: ${info.appPath}`);
      })
      .catch((error: unknown) => {
        if (active) setStatus(error instanceof Error ? error.message : String(error));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [revision]);
  const markdown = `# Loop Installation

${status}

## Before You Start

1. Install and open Loop 1.4.2 or later.
2. Enable **Loop** in System Settings → Privacy & Security → Accessibility.
3. Focus a resizable application window, then run a Loop command from Raycast.

## Named Layouts, Cycles, and Stashes

Name the keybind in Loop, then run **Run Named Keybind** with that name (case-insensitive). **Show Named Keybinds** asks Loop to open its list in your text editor.

## Sent, but Nothing Changed?

Loop's URL interface does not report execution results. “Sent to Loop” means macOS accepted the request. This check reads the app's installation metadata; it cannot verify Accessibility permission, window selection, or keybind names.

Check Loop's permission and first-run setup, and focus a resizable window. If the wrong window moves, disable Loop's option to resize the window under the cursor, or move your cursor over the intended window. Increase **Focus Restore Delay** in extension preferences if needed. If a cold start does not apply an action, wait for Loop to finish starting and try again.

The action catalog targets Loop 1.4.2. Earlier versions may not support every action. No additional CLI, server, or API key is required.`;
  return (
    <Detail
      isLoading={loading}
      markdown={markdown}
      actions={
        <ActionPanel>
          <Action
            title="Recheck Installation"
            icon={Icon.ArrowClockwise}
            onAction={() => setRevision((value) => value + 1)}
          />
          <Action title="Extension Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
          <Action.OpenInBrowser
            title="Accessibility Settings"
            url="x-apple.systempreferences:com.apple.preference.security?Privacy_Accessibility"
          />
          <Action
            title="Show Named Keybinds"
            icon={Icon.List}
            onAction={() => sendRequest({ kind: "list", value: "keybinds" })}
          />
          <Action
            title="Show All Loop Commands"
            icon={Icon.List}
            onAction={() => sendRequest({ kind: "list", value: "all" })}
          />
          <Action.OpenInBrowser title="Download Loop" url="https://github.com/mrkai77/Loop/releases" />
        </ActionPanel>
      }
    />
  );
}
