import { Action, ActionPanel, Detail, Icon, open } from "@raycast/api";

export default function IntelligenceNotReadyView() {
  const markdown = `# Apple Intelligence Not Available

**apfel** is installed, but Apple Intelligence is not available on this system.

## How to enable it

1. Open **System Settings**
2. Go to **Apple Intelligence & Siri**
3. Enable **Apple Intelligence**
4. Wait for the model to download — this may take a few minutes

Once enabled, reopen this command.
`;

  return (
    <Detail
      markdown={markdown}
      actions={
        <ActionPanel>
          <Action
            title="Open Apple Intelligence Settings"
            icon={Icon.Gear}
            onAction={() => open("x-apple.systempreferences:com.apple.Siri-Settings.extension")}
          />
        </ActionPanel>
      }
    />
  );
}
