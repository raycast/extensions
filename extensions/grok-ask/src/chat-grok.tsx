import { LaunchProps } from "@raycast/api";
import { ConversationList } from "./views/ConversationList";

export default function ChatGrok(
  props: LaunchProps<{ launchContext?: { conversationId?: string } }>,
) {
  return (
    <ConversationList
      initialConversationId={props.launchContext?.conversationId}
    />
  );
}
