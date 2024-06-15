import { Action, ActionPanel } from "@raycast/api";
import { RETRAC_URL } from "../utils/constants";

export function ActionGoRetrac() {
  return (
    <ActionPanel.Section>
      <Action.OpenInBrowser title="Go to Retrac" shortcut={{ modifiers: ["cmd"], key: "g" }} url={RETRAC_URL} />
    </ActionPanel.Section>
  );
}