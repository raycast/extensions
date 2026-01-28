import { Action, Icon, launchCommand, LaunchType } from "@raycast/api";
import { contentExtractor } from "../utils/helpers";
import { Status } from "../utils/types";

interface ReplyActionProps {
  status: Status;
}

const ReplyAction: React.FC<ReplyActionProps> = ({ status }) => (
  <Action
    title={"Reply"}
    icon={Icon.Reply}
    shortcut={{ modifiers: ["cmd"], key: "r" }}
    onAction={async () => {
      launchCommand({
        name: "post-status",
        type: LaunchType.UserInitiated,
        context: {
          action: "reply",
          status: {
            ...status,
            replyStatus: contentExtractor(status.content),
            in_reply_to_id: status.id,
          },
        },
      });
    }}
  />
);

export default ReplyAction;
