/** How a message is shown in lists and detail panes. Pure: no Raycast imports. */

import type { Message } from "../api/types";
import { chatToMarkdown, chatToPlainText, mentionNames, type UserNames } from "./chat-format";
import { userDisplayName } from "./dm-names";

/** Sender's name: from the message, else the space's member names, else "Unknown". */
export function senderName(message: Message, names: UserNames = {}): string {
  const sender = message.sender;
  if (!sender) return "Unknown";
  return userDisplayName(sender) ?? names[sender.name] ?? (sender.type === "BOT" ? "App" : "Unknown");
}

/** One-line text for a list item title. */
export function messageSnippet(message: Message, names: UserNames = {}): string {
  const text = chatToPlainText(message.text, mentionNames(message, names));
  if (text) return text;
  if (message.attachment?.length)
    return `📎 ${message.attachment.map((a) => a.contentName ?? "Attachment").join(", ")}`;
  return message.fallbackText || (message.deleteTime ? "Message deleted" : "(no text)");
}

function formatTime(value: string | undefined): string {
  if (!value) return "";
  return new Date(value).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

/** Markdown for the detail pane: sender, time, body, attachments and reactions. */
export function messageMarkdown(message: Message, names: UserNames = {}): string {
  const parts: string[] = [];
  const edited = message.lastUpdateTime ? " · edited" : "";
  const reply = message.threadReply ? " · reply in thread" : "";
  parts.push(`**${senderName(message, names)}** · ${formatTime(message.createTime)}${edited}${reply}`);
  parts.push(chatToMarkdown(message.text, mentionNames(message, names)) || "_No text_");

  const attachments = (message.attachment ?? []).map((a) => {
    const label = a.contentName ?? "Attachment";
    return a.downloadUri ? `- [${label}](${a.downloadUri})` : `- ${label}`;
  });
  if (attachments.length) parts.push(`**Attachments**\n\n${attachments.join("\n")}`);

  const reactions = (message.emojiReactionSummaries ?? [])
    .filter((r) => r.emoji?.unicode || r.emoji?.customEmoji?.emojiName)
    .map((r) => `${r.emoji?.unicode ?? `:${r.emoji?.customEmoji?.emojiName}:`} ${r.reactionCount ?? 1}`);
  if (reactions.length) parts.push(reactions.join("   "));

  return parts.join("\n\n");
}
