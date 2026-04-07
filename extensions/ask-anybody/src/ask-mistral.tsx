import { LaunchProps } from "@raycast/api";
import { openChat } from "./open-chat";

export default async function Command(props: LaunchProps<{ arguments: Arguments.AskMistral }>) {
  await openChat(props, "Mistral", (q) => `https://chat.mistral.ai/chat?q=${encodeURIComponent(q)}`);
}
