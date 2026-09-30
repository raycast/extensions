import { ActionPanel, Action, Icon, List, Color, openExtensionPreferences } from '@raycast/api';

export default function Command() {
  return (
    <List>
      <List.EmptyView
        icon={{ source: Icon.Warning, tintColor: Color.Yellow }}
        title="Deprecated extension"
        description='This extension was merged into the original "HTTP Status Code" extension.
You can uninstall it from the Preferences'
        actions={
          <ActionPanel>
            <Action
              onAction={openExtensionPreferences}
              title="Open Extension Preferences"
              icon={Icon.Gear}
              shortcut={{ modifiers: ['cmd', 'shift'], key: ',' }}
            />
          </ActionPanel>
        }
      />
    </List>
  );
}
