import { LaunchProps } from "@raycast/api";
import { openChat } from "./open-chat";

export default async function Command(props: LaunchProps<{ arguments: Arguments.AskGrok }>) {
  await openChat(props, "Grok", (q) => `https://grok.com/?q=${encodeURIComponent(q)}`);
}
