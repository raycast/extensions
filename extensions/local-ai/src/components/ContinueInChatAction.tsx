import { Action, Icon, LaunchType, launchCommand } from "@raycast/api";
import type { ChatLaunchContext } from "../lib/launch-context";

export function ContinueInChatAction(props: { userMessage: string; assistantMessage: string }) {
  const context: ChatLaunchContext = {
    seed: { userMessage: props.userMessage, assistantMessage: props.assistantMessage },
  };
  return (
    <Action
      title="Continue in Chat"
      icon={Icon.Message}
      onAction={() => launchCommand({ name: "chat-with-local-ai", type: LaunchType.UserInitiated, context })}
    />
  );
}
