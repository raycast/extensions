import { LaunchProps } from "@raycast/api";
import { openChat } from "./open-chat";

export default async function Command(props: LaunchProps<{ arguments: Arguments.AskChatgpt }>) {
  await openChat(props, "ChatGPT", (q) => `https://chatgpt.com/?q=${encodeURIComponent(q)}`);
}
