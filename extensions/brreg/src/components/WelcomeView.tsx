import { Detail, ActionPanel, Action, useNavigation } from "@raycast/api";
import { WELCOME_MARKDOWN } from "../constants";
import KeyboardShortcutsHelp from "./KeyboardShortcutsHelp";

export default function WelcomeView() {
  const { pop } = useNavigation();

  return (
    <Detail
      markdown={WELCOME_MARKDOWN}
      actions={
        <ActionPanel>
          <Action.Push title="Keyboard Shortcuts" target={<KeyboardShortcutsHelp />} />
          <Action title="Back" onAction={pop} />
        </ActionPanel>
      }
    />
  );
}
