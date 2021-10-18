import { ActionPanel, Icon, showToast, ToastStyle } from "@raycast/api";
import { ConversationInfo, slackService } from "./slackClient";

export function MarkAsReadAction(props: { conversation: ConversationInfo; title?: string }) {
  return (
    <ActionPanel.Item
      title={props.title ?? `Mark as Read`}
      icon={Icon.Checkmark}
      onAction={() => {
        showToast(ToastStyle.Animated, `Marking as Read ${props.conversation.name}`);
        const error = slackService.markAsRead(props.conversation);
        if (error) {
          showToast(ToastStyle.Failure, `Failed mark as read ${props.conversation.name}: ${error}`);
        } else {
          showToast(ToastStyle.Success, `Marked as Read  ${props.conversation.name}`);
        }
      }}
    />
  );
}
