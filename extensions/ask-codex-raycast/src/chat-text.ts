import { join } from "node:path";
import { pathToFileURL } from "node:url";
import type { ChatMessage } from "./conversations";
import { renderMarkdown } from "./markdown";

export function conversationMarkdown(
  messages: ChatMessage[],
  assetsPath: string,
  status: string,
  error: string,
) {
  const cards = [...messages].reverse().map((message) => {
    const speaker =
      message.role === "assistant"
        ? "Codex"
        : message.kind === "steer"
          ? "你 · 补充要求"
          : "你";
    const avatar =
      message.role === "assistant" ? "command-icon.png" : "user-avatar.svg";
    const avatarURL = pathToFileURL(join(assetsPath, avatar));
    avatarURL.search = "raycast-width=22&raycast-height=22";
    const body = renderMarkdown(message.content) || "正在思考…";
    return `![${speaker}](<${avatarURL.href}>) **${speaker}**\n\n${body}`;
  });
  const notice = error || status;
  const header = notice
    ? `${error ? "**连接提示** · " : ""}${notice.replace(/\r?\n/g, " ")}\n\n`
    : "";
  return (
    header +
    (cards.join("\n\n---\n\n") ||
      "**Codex in Raycast**\n\n按 Enter 打开输入浮层，输入消息后再按 Enter 发送。回复与追问会保留在同一对话里。")
  );
}
