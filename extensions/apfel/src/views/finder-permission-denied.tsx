import { Action, ActionPanel, Detail, Icon, open } from "@raycast/api";

export default function FinderPermissionDeniedView() {
  const markdown = `# Finder Access Required

Raycast doesn't have permission to access Finder, which is needed to get your selected files and folders.

## How to enable it

1. Open **System Settings**
2. Go to **Privacy & Security → Automation**
3. Find **Raycast** in the list
4. Enable the toggle next to **Finder**

Once enabled, reopen this command.
`;

  return (
    <Detail
      markdown={markdown}
      actions={
        <ActionPanel>
          <Action
            title="Open Automation Settings"
            icon={Icon.Gear}
            onAction={() => open("x-apple.systempreferences:com.apple.preference.security?Privacy_Automation")}
          />
        </ActionPanel>
      }
    />
  );
}
