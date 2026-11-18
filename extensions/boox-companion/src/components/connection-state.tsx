import { Action, ActionPanel, Icon, List, openExtensionPreferences } from "@raycast/api";
import { describeBooxError } from "../lib/errors";

export function ConnectionEmptyView(props: { error?: unknown; onRetry: () => void; isLoading?: boolean }) {
  return (
    <List.EmptyView
      icon={props.isLoading ? Icon.Network : Icon.WifiDisabled}
      title={props.isLoading ? "Looking for BOOX" : "BOOX Unavailable"}
      description={props.isLoading ? "Checking the local network…" : describeBooxError(props.error)}
      actions={
        <ActionPanel>
          <Action title="Search Again" icon={Icon.ArrowClockwise} onAction={props.onRetry} />
          <Action title="Open Extension Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
        </ActionPanel>
      }
    />
  );
}
