import { t } from "./i18n";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import type { ChatMessage } from "./conversations";
import { renderMarkdown, stripMessageDividers } from "./markdown";

/** Newest exchanges first; preserve the original order inside each exchange. */
export function conversationGroups(messages: ChatMessage[]): ChatMessage[][] {
  const groups: ChatMessage[][] = [];
  for (const message of messages) {
    if (!groups.length || (message.role === "user" && message.kind !== "steer"))
      groups.push([]);
    groups[groups.length - 1].push(message);
  }
  return groups.reverse();
}

export function conversationMarkdown(
  messages: ChatMessage[],
  assetsPath: string,
  status: string,
  error: string,
  assistant = "Codex",
  assistantIcon?: string,
) {
  // Keep the latest exchange in view without reversing question/answer order.
  // Steering and multiple assistant items stay in their original turn order.
  // Inline images otherwise sit above the text baseline. Standard subscript
  // positioning and an 18px icon align both roles with their names.
  function avatar(file: string, label: string) {
    const url = pathToFileURL(join(assetsPath, file));
    url.search = "raycast-width=18&raycast-height=18";
    return `<sub>![${label}](<${url.href}>)</sub> `;
  }
  const speaker = `${assistantIcon ? avatar(assistantIcon, assistant) : ""}**${assistant}**`;
  const userAvatar = avatar("user-avatar.svg", t("You"));
  const cards = conversationGroups(messages).map((round) =>
    round
      .map((message, index) => {
        const body =
          renderMarkdown(
            message.role === "assistant"
              ? stripMessageDividers(message.content)
              : message.content,
          ) || t("Thinking…");
        if (message.role === "user") {
          const label =
            message.kind === "steer" ? t("Additional Instructions") : t("You");
          // Quote every line so multiline prompts and fenced code remain a
          // single, readable question block in Raycast's native Markdown.
          return `${userAvatar}**${label}**\n\n${body
            .split("\n")
            .map((line) => `> ${line}`)
            .join("\n")}`;
        }
        return round[index - 1]?.role === "assistant"
          ? body
          : `${speaker}\n\n${body}`;
      })
      .join("\n\n"),
  );
  const notice = error || status;
  const header = notice
    ? `${error ? `**${t("Connection Notice")}** · ` : ""}${notice.replace(/\r?\n/g, " ")}\n\n`
    : "";
  return (
    header +
    (cards.join("\n\n---\n\n") ||
      `### ${t("What would you like to work on?")}\n\n${t("Press Enter to write a message.")}`)
  );
}
