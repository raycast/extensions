import { Action, ActionPanel, Detail, Icon, open } from "@raycast/api";

const helpText = `
**Wondering why there aren't more layouts available?** The extension uses [keyboardSwitcher](https://github.com/Lutzifer/keyboardSwitcher "") by [Wolfgang Lutz](https://github.com/ "") to *list* and *switch* available layouts. However, *keyboardSwitcher* only supports listing and switching to layouts which are added as input source in the System Preferences. Essentially the extension replaces the *Input Sources* menu item.

To **add more layouts**, open the Keyboard Pane in the System Preferences (press enter ↩︎ while reading this help text) and navigate to the *Input Sources* tab. On the left you’ll see a list of your currently available layouts. Add more by pressing the + button. In the new dialogue, select a language on the left and confirm by pressing the *Add* button.`;

export function Help() {
  return (
    <Detail
      markdown={helpText}
      actions={
        <ActionPanel>
          <Action
            icon={Icon.Gear}
            title="Open Keyboard Preferences"
            onAction={() => open("/System/Library/PreferencePanes/Keyboard.prefPane")}
          />
        </ActionPanel>
      }
    />
  );
}
