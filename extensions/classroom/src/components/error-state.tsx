import {
  Action,
  ActionPanel,
  Icon,
  launchCommand,
  LaunchType,
  List,
  openExtensionPreferences,
} from "@raycast/api";

export function ErrorState({
  message,
  refresh,
}: {
  message: string;
  refresh: () => Promise<void>;
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
            onAction={() =>
              launchCommand({ name: "connect", type: LaunchType.UserInitiated })
            }
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
