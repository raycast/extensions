import { Action, Icon } from "@raycast/api";
import type { ChatLaunchContext } from "../lib/launch-context";
import { launchLocalAiCommand } from "../services/launch";

export function ContinueInChatAction(props: { userMessage: string; assistantMessage: string; title?: string }) {
  const context: ChatLaunchContext = {
    seed: { userMessage: props.userMessage, assistantMessage: props.assistantMessage, title: props.title },
  };
  return (
    <Action
      title="Continue in Chat"
      icon={Icon.Message}
      onAction={() => launchLocalAiCommand({ name: "chat-with-local-ai", title: "Chat with Local AI", context })}
    />
  );
}
