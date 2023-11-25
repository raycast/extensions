import { Action, ActionPanel } from "@raycast/api";

export function ActionToIconPark() {
  return (
    <ActionPanel.Section>
      <Action.OpenInBrowser
        title="Go to IconPark"
        shortcut={{ modifiers: ["cmd"], key: "g" }}
        url={"https://iconpark.oceanengine.com/official"}
      />
    </ActionPanel.Section>
  );
}
