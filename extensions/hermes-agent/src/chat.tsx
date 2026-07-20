import { LaunchProps } from "@raycast/api";
import { ConversationView } from "./conversation";

export default function Command(
  props: LaunchProps<{
    launchContext?: { sessionId?: string; title?: string };
  }>,
) {
  return (
    <ConversationView
      sessionId={props.launchContext?.sessionId}
      sessionTitle={props.launchContext?.title}
    />
  );
}
