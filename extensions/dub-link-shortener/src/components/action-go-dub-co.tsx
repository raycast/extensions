import { Action, ActionPanel } from "@raycast/api";
import { DUB_CO_URL } from "../utils/constants";

export function ActionGoDubCo() {
  return (
    <ActionPanel.Section>
      <Action.OpenInBrowser title="Go to Dub.co" shortcut={{ modifiers: ["cmd"], key: "g" }} url={DUB_CO_URL} />
    </ActionPanel.Section>
  );
}
