import { LaunchProps } from "@raycast/api";
import { openChat } from "./open-chat";

export default async function Command(props: LaunchProps<{ arguments: Arguments.AskClaudeDesktop }>) {
  await openChat(
    props,
    "Claude",
    (q) => `claude://claude.ai/new?q=${encodeURIComponent(q)}`,
    "com.anthropic.claudefordesktop",
  );
}
