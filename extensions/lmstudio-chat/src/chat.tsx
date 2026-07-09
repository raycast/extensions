import { LaunchProps } from "@raycast/api";
import { ChatView } from "./views/ChatView";

export default function Chat(
  props: LaunchProps<{ arguments: Arguments.Chat }>,
) {
  return <ChatView initialPrompt={props.arguments.prompt} />;
}
