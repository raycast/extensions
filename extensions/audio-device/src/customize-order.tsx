import { Action, ActionPanel, Detail, launchCommand, LaunchType, openCommandPreferences } from "@raycast/api";

const markdown = `# Command Replaced

The **Customize Order** command has been removed.

The old priority-ordering system (where you ranked multiple devices as fallbacks) has been replaced by a simpler single-default model.

## What to do instead

1. Open **Set Output Device** or **Set Input Device**
2. Press **Cmd+Shift+D** on the device you want to select as default
3. That device will be automatically restored within 10 seconds if macOS switches away
`;

export default function Command() {
  return (
    <Detail
      markdown={markdown}
      actions={
        <ActionPanel>
          <Action
            title="Open Set Output Device"
            onAction={() => launchCommand({ name: "set-output-device", type: LaunchType.UserInitiated })}
          />
          <Action
            title="Open Set Input Device"
            onAction={() => launchCommand({ name: "set-input-device", type: LaunchType.UserInitiated })}
          />
          <Action title="Disable This Command" onAction={openCommandPreferences} />
        </ActionPanel>
      }
    />
  );
}
