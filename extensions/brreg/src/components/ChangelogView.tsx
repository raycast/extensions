import { Action, ActionPanel, Detail, useNavigation } from "@raycast/api";
import { useEffect } from "react";
import { APP_VERSION, getChangelogMarkdown } from "../constants";
import KeyboardShortcutsHelp from "./KeyboardShortcutsHelp";
import { useChangelogVersionGate } from "../hooks/useChangelogVersionGate";

export default function ChangelogView() {
  const { pop } = useNavigation();
  const { markCurrentVersionAsSeen, isLoading } = useChangelogVersionGate();

  useEffect(() => {
    if (isLoading) return;
    void markCurrentVersionAsSeen();
  }, [isLoading, markCurrentVersionAsSeen]);

  return (
    <Detail
      markdown={getChangelogMarkdown(APP_VERSION)}
      actions={
        <ActionPanel>
          <Action title="Close Changelog" onAction={pop} shortcut={{ modifiers: [], key: "enter" }} />
          <Action.Push
            title="Keyboard Shortcuts"
            target={<KeyboardShortcutsHelp />}
            shortcut={{ modifiers: ["shift"], key: "enter" }}
          />
        </ActionPanel>
      }
    />
  );
}
