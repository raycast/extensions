import { Action, ActionPanel, Color, Icon } from "@raycast/api";
import { Storage } from "../hooks/useColorStorage";

export default function GeneralActions({ history }: { history: Storage }) {
  return (
    <ActionPanel.Section>
      <Action
        title="Clear History"
        shortcut={{ modifiers: ["opt", "shift"], key: "c" }}
        icon={{ source: Icon.XmarkCircle, tintColor: Color.Red }}
        onAction={() => history.clear()}
      />
      <Action.OpenInBrowser title="Support" icon={{ source: "heart.png" }} url="https://ko-fi.com/slavarazum" />
    </ActionPanel.Section>
  );
}
