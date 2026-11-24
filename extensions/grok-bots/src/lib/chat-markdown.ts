import type { Bot, ChatMessage } from "./roster";

/** "now", "5m", "2h", "Mon 9:41 AM" or "Nov 18". */
export function shortTime(timestamp: number): string {
  const minutes = Math.round((Date.now() - timestamp) / 60_000);
  if (minutes < 1) return "now";
  if (minutes < 60) return `${minutes}m`;
  if (minutes < 24 * 60) return `${Math.round(minutes / 60)}h`;
  const options: Intl.DateTimeFormatOptions =
    minutes < 7 * 24 * 60
      ? { weekday: "short", hour: "numeric", minute: "2-digit" }
      : { month: "short", day: "numeric" };
  return new Date(timestamp).toLocaleString("en-US", options);
}

/** An image's alt text as a plain placeholder, so the panel never loads anything. */
const placeholder = (alt: string) => `_[image${alt.trim() ? `: ${alt.trim()}` : ""}]_`;

/**
 * Keeps a message from breaking the layout or reaching the network: images become text
 * placeholders (Raycast would otherwise fetch them from their hosts), headings become bold
 * lines, and rules are dropped.
 */
function tame(markdown: string): string {
  return markdown
    .replace(/!\[([^\]]*)\]\((?:[^()\s]|\([^()]*\))*(?:\s+(?:"[^"]*"|'[^']*'|\([^)]*\)))?\s*\)/g, (_, alt) =>
      placeholder(alt),
    )
    .replace(/!\[([^\]]*)\]\[[^\]]*\]/g, (_, alt) => placeholder(alt))
    .replace(/<img\b[^>]*>/gi, placeholder(""))
    .replace(/^#{1,6}\s+(.+)$/gm, "**$1**")
    .replace(/^\s*(-{3,}|\*{3,}|_{3,})\s*$/gm, "")
    .trim();
}

/** The Bot's recent chat as Markdown for the details panel, newest message first. */
export function chatMarkdown(bot: Bot): string {
  const messages = bot.recentMessages;
  if (!messages || messages.length === 0) {
    return [
      `### ${bot.name}`,
      "",
      bot.lastMessage ? `> ${tame(bot.lastMessage.text).replace(/\n/g, "\n> ")}` : "",
      "",
      "_Grok Bot hasn't saved recent messages for this chat on your Mac. Open the chat (⌘O) to see it._",
    ].join("\n");
  }
  const blocks = [...messages].reverse().map((message: ChatMessage) => {
    const who = message.from === "you" ? "**You**" : `**${bot.firstName}**`;
    const when = message.timestamp ? ` · ${shortTime(message.timestamp)}` : "";
    return `${who}${when}\n\n${tame(message.text)}`;
  });
  return blocks.join("\n\n---\n\n");
}
