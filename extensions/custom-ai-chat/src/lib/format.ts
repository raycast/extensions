import { Conversation, Message } from "../types";

function pad(value: number): string {
  return String(value).padStart(2, "0");
}

// Set to a fixed string (e.g. "11-24 10:30") for stable screenshots; null shows real times.
const DEMO_TIME_OVERRIDE: string | null = null;

export function formatTime(timestamp: number): string {
  if (DEMO_TIME_OVERRIDE !== null) {
    return DEMO_TIME_OVERRIDE;
  }
  const date = new Date(timestamp);
  return `${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function stripMarkdown(value: string): string {
  return value
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/[#>*_`~]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function getPreview(conversation: Conversation): string {
  if (conversation.messages.length === 0) {
    return "Empty conversation";
  }

  const last = conversation.messages[conversation.messages.length - 1];
  return stripMarkdown(last.content).slice(0, 48) || "Empty conversation";
}

function toBlockquote(content: string): string {
  return content
    .split("\n")
    .map((line) => `> ${line}`)
    .join("\n");
}

function renderMessage(message: Message, modelName?: string): string {
  const time = formatTime(message.createdAt);

  if (message.role === "user") {
    const meta = ["**You**", `\`${time}\``, modelName ? `\`${modelName}\`` : ""].filter(Boolean).join(" · ");
    return `${meta}\n\n${toBlockquote(message.content)}`;
  }

  const statusLabel = getStatusLabel(message.status);
  const meta = ["**AI**", message.tokens ? `\`${message.tokens} tokens\`` : "", statusLabel ? `\`${statusLabel}\`` : ""]
    .filter(Boolean)
    .join(" · ");

  return `${meta}\n\n${toBlockquote(message.content)}`;
}

function getStatusLabel(status: Message["status"]): string {
  switch (status) {
    case "streaming":
      return "Generating…";
    case "done":
      return "Done";
    case "cancelled":
      return "Cancelled";
    case "error":
      return "Generation failed";
    case "interrupted":
      return "Interrupted";
    default:
      return "";
  }
}

function groupIntoTurns(messages: Message[]): Message[][] {
  const turns: Message[][] = [];

  for (const message of messages) {
    if (message.role === "user" || turns.length === 0) {
      turns.push([message]);
    } else {
      turns[turns.length - 1].push(message);
    }
  }

  return turns;
}

export function renderConversation(conversation: Conversation): string {
  if (conversation.messages.length === 0) {
    return "_Type a question and press Enter to start the conversation._";
  }

  return groupIntoTurns(conversation.messages)
    .reverse()
    .map((turn) => {
      const modelName = turn.find((message) => message.role === "assistant")?.modelName;
      return turn.map((message) => renderMessage(message, modelName)).join("\n\n");
    })
    .join("\n\n---\n\n");
}
