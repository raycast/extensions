import { LaunchProps } from "@raycast/api";
import { openChat } from "./open-chat";

export default async function Command(props: LaunchProps<{ arguments: Arguments.AskClaude }>) {
  await openChat(props, "Claude", (q) => `https://claude.ai/new?q=${encodeURIComponent(q)}`);
}
