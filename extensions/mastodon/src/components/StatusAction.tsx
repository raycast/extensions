import { ActionPanel, launchCommand, Action, Icon, LaunchType } from "@raycast/api";
import { Status } from "../utils/types";

interface StatusActionProps {
  status: Status;
}
const StatusAction: React.FC<StatusActionProps> = ({ status }) => {
  return (
    <ActionPanel>
      {status.url && <Action.OpenInBrowser url={status.url} />}
      <Action
        title="Reply"
        icon={Icon.Reply}
        onAction={async () => {
          launchCommand({ name: "status", type: LaunchType.UserInitiated, context: { replyTo: status } });
        }}
      />
      <Action
        title="Edit"
        icon={Icon.Reply}
        onAction={async () => {
          launchCommand({ name: "status", type: LaunchType.UserInitiated, context: { replyTo: status } });
        }}
      />
      <Action
        title="Delete"
        icon={Icon.Reply}
        onAction={async () => {
          launchCommand({ name: "status", type: LaunchType.UserInitiated, context: { replyTo: status } });
        }}
      />
      {/* <ActionPanel.Section>
        <Action
          title="Bookmark"
          icon={Icon.Reply}
          onAction={async () => {
            launchCommand({ name: "status", type: LaunchType.UserInitiated, context: { replyTo: status } });
          }}
        />
        <Action
          title="Boost"
          icon={Icon.Reply}
          onAction={async () => {
            launchCommand({ name: "status", type: LaunchType.UserInitiated, context: { replyTo: status } });
          }}
        />
        <Action
          title="Favourite"
          icon={Icon.Reply}
          onAction={async () => {
            launchCommand({ name: "status", type: LaunchType.UserInitiated, context: { replyTo: status } });
          }}
        />
      </ActionPanel.Section> */}
    </ActionPanel>
  );
};
export default StatusAction;
