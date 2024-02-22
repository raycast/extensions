import { Action, ActionPanel } from "@raycast/api";

export const Actions = () => {
  return (
    <ActionPanel>
      <Action.Open target={"/System/Applications/Utilities/Activity Monitor.app"} title="Open Activity Monitor" />
    </ActionPanel>
  );
};
