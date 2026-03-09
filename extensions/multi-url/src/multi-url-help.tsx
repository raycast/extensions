import {
  Action,
  ActionPanel,
  Detail,
  Icon,
  openExtensionPreferences,
} from "@raycast/api";

const HELP_MARKDOWN = `# Multi-URL

Open recurring links as reusable URL sets, then launch them in one action.

## Commands

- **Multi-URL**: Dashboard for saved sets, recent runs, and set management.
- **New Set from Clipboard**: Create a saved set directly from clipboard text.
- **QuickURL #1 to #5**: Customize your own no-view commands for hotkey-based launches.

## Keyboard Shortcuts

### Available in Multi-URL views

- **Cmd + Shift + I**: Open this help view.

### Create forms

- **Cmd + Shift + Return**: Save Set and Open Links.

### Dashboard item actions

- **Cmd + N**: Create New Set.
- **Cmd + Shift + V**: Create from Clipboard.
- **Cmd + R**: Refresh data.
- **Cmd + Opt + P**: Pin Set.
- **Cmd + Shift + P**: Unpin Set.
- **Cmd + Shift + Opt + S**: View Set Stats.
- **Cmd + D**: Duplicate Set.
- **Cmd + M**: Merge Set (submenu).
- **Cmd + E**: Edit Set.
- **Cmd + U**: Map to QuickURL.
- **Cmd + Backspace**: Move Set to Trash.
- **Cmd + Shift + .**: Open Extension Settings.

### QuickURL tips

- Map sets from the dashboard actions.
- Bind global hotkeys for **QuickURL #1 to #5** in Raycast Settings.
`;

export function MultiUrlHelpDetail() {
  return (
    <Detail
      navigationTitle="Multi-URL Help"
      markdown={HELP_MARKDOWN}
      actions={
        <ActionPanel>
          <Action
            title="Open Extension Settings"
            icon={Icon.Gear}
            onAction={() => void openExtensionPreferences()}
          />
        </ActionPanel>
      }
    />
  );
}

export function MultiUrlHelpAction() {
  return (
    <Action.Push
      title="Help: Overview + Shortcuts"
      icon={Icon.Info}
      shortcut={{ modifiers: ["cmd", "shift"], key: "i" }}
      target={<MultiUrlHelpDetail />}
    />
  );
}
