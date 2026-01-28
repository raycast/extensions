import { Action, ActionPanel } from "@raycast/api";

export const getGreipActions = () => {
  return (
    <ActionPanel.Section title="Greip Pages">
      <Action.OpenInBrowser
        url="https://greip.io"
        title="Greip Website"
        shortcut={{ modifiers: ["cmd", "shift"], key: "1" }}
      />
      <Action.OpenInBrowser
        url="https://greip.io/dashboard/Home"
        title="Greip Dashboard"
        shortcut={{ modifiers: ["cmd", "shift"], key: "2" }}
      />
      <Action.OpenInBrowser
        url="https://docs.greip.io"
        title="Greip Documentation"
        shortcut={{ modifiers: ["cmd", "shift"], key: "3" }}
      />
    </ActionPanel.Section>
  );
};
