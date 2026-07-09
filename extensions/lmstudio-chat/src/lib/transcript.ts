import { Color } from "@raycast/api";
import { Chat, Message } from "./types";

export interface Turn {
  question: Message;
  answer?: Message;
  userIndex: number;
}

export function splitIntoTurns(chat: Chat): Turn[] {
  const turns: Turn[] = [];
  chat.messages.forEach((m, index) => {
    if (m.role === "user") {
      turns.push({ question: m, userIndex: index });
    } else if (turns.length > 0 && !turns[turns.length - 1].answer) {
      turns[turns.length - 1].answer = m;
    }
  });
  return turns;
}

export function answerText(turn: Turn): string {
  return turn.answer?.content ?? "";
}

function attachmentsMarkdown(message: Message): string {
  const attachments = message.attachments ?? [];
  if (attachments.length === 0) return "";
  const lines = attachments.map((a) =>
    a.type === "image"
      ? `![${a.name}](file://${encodeURI(a.path)})`
      : `📎 ${a.name}`,
  );
  return `\n\n${lines.join("\n\n")}`;
}

export function hasAttachments(turn: Turn): boolean {
  return (turn.question.attachments ?? []).length > 0;
}

export function turnMarkdown(turn: Turn, model: string): string {
  return (
    `**🧑 You**\n\n${turn.question.content}${attachmentsMarkdown(turn.question)}\n\n` +
    `---\n\n` +
    `**🤖 ${model}**\n\n${turn.answer?.content || "…"}`
  );
}

export function shortModelName(modelId: string): string {
  const slash = modelId.lastIndexOf("/");
  return slash >= 0 ? modelId.slice(slash + 1) : modelId;
}

const PALETTE: Color[] = [
  Color.Blue,
  Color.Green,
  Color.Magenta,
  Color.Orange,
  Color.Purple,
  Color.Red,
  Color.Yellow,
];

export function modelColor(modelId: string): Color {
  let hash = 0;
  for (let i = 0; i < modelId.length; i++) {
    hash = (hash * 31 + modelId.charCodeAt(i)) >>> 0;
  }
  return PALETTE[hash % PALETTE.length];
}
