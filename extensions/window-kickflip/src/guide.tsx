import { Action, ActionPanel, Detail, Icon, openExtensionPreferences } from "@raycast/api";
import { doKickflip } from "./lib/kickflip";

const markdown = `
# Do a kickflip

Give your focused window a little airtime.

Air thrusters lift your window, then roll it through a full 360° near the top. Opposing jets slow the spin before a controlled landing, with a quiet hiss and touchdown thump. Inspired by the Tesla Roadster kickflip.

## How to use

Focus the window you want to flip, open Raycast, and run **Kickflip**. You can also press **Return** here to flip the window behind Raycast.

Assign a hotkey to **Kickflip** in Raycast Settings for instant airtime.

Sound is on by default. Turn off **Sound Effects** in this extension's preferences for a silent kickflip.

## Requirements

- macOS 14 or later
- Screen Recording permission for Raycast
- Any standard window. Fullscreen windows are skipped.

The animation uses temporary snapshots of your window and the desktop behind it. Your live window stays in place. The images stay in memory and are discarded when the animation ends.

If prompted, allow Raycast in **System Settings → Privacy & Security → Screen & System Audio Recording**, then restart Raycast.
`;

export default function Command() {
  return (
    <Detail
      markdown={markdown}
      actions={
        <ActionPanel>
          <Action title="Do a Kickflip" icon={Icon.Rocket} onAction={doKickflip} />
          <Action title="Open Extension Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
          <Action.OpenInBrowser title="Open Inspiration" url="https://x.com/Tesla/status/2110926164306931860" />
        </ActionPanel>
      }
    />
  );
}
