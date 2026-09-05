import {
  Action,
  ActionPanel,
  Icon,
  LaunchType,
  launchCommand,
} from "@raycast/api";
import { oauthClient } from "./oauth";

export function ErrorActions({
  command,
  onRetry,
}: {
  command:
    | "search-kato"
    | "objects"
    | "my-day"
    | "my-tasks"
    | "create-task"
    | "capture-task"
    | "upcoming-meetings"
    | "notifications"
    | "connection";
  onRetry: () => void;
}) {
  return (
    <ActionPanel>
      <Action title="Retry" icon={Icon.RotateClockwise} onAction={onRetry} />
      <Action
        title="Reconnect Kato"
        icon={Icon.Link}
        onAction={async () => {
          await oauthClient.removeTokens();
          await launchCommand({
            name: command,
            type: LaunchType.UserInitiated,
          });
        }}
      />
    </ActionPanel>
  );
}
