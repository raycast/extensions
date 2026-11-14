import { launch } from "../lib/launch";
import {
  Action,
  ActionPanel,
  Icon,
  List,
  openExtensionPreferences,
} from "@raycast/api";

export function ErrorState({
  message,
  refresh,
}: {
  message: string;
  refresh: () => void;
}) {
  return (
    <List.EmptyView
      icon={Icon.ExclamationMark}
      title="Could Not Load Google Classroom"
      description={message}
      actions={
        <ActionPanel>
          <Action
            title="Refresh"
            icon={Icon.ArrowClockwise}
            onAction={refresh}
          />
          <Action
            title="Connect Google Classroom"
            icon={Icon.Person}
            onAction={() => launch("connect")}
          />
          <Action
            title="Extension Preferences"
            icon={Icon.Gear}
            onAction={openExtensionPreferences}
          />
        </ActionPanel>
      }
    />
  );
}
