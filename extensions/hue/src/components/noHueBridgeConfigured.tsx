import { Action, ActionPanel, Detail, Icon, popToRoot } from "@raycast/api";
import { noBridgeConfiguredMessage } from "../lib/markdown";

export default function NoHueBridgeConfigured() {
  return (
    <Detail
      key="hueBridgeNotFound"
      markdown={noBridgeConfiguredMessage}
      actions={
        <ActionPanel>
          <Action title="Link With Bridge" onAction={() => popToRoot()} icon={Icon.Plug} />
        </ActionPanel>
      }
    />
  );
}
