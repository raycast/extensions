import { Action, ActionPanel } from "@raycast/api";
import { SM_MS_URL } from "../utils/costants";

export function ActionToSmMs() {
  return (
    <ActionPanel.Section>
      <Action.OpenInBrowser title="Go SM.MS" shortcut={{ modifiers: ["cmd"], key: "g" }} url={SM_MS_URL} />
    </ActionPanel.Section>
  );
}
