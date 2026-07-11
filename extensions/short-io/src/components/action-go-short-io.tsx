import { Action, ActionPanel } from "@raycast/api";
import { SHORT_IO_URL } from "../utils/constants";

export function ActionGoShortIo() {
  return (
    <ActionPanel.Section>
      <Action.OpenInBrowser title="Go to Short.io" shortcut={{ modifiers: ["cmd"], key: "g" }} url={SHORT_IO_URL} />
    </ActionPanel.Section>
  );
}
