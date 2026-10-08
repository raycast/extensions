import { ChatMessage } from "./transcript";

export interface Turn {
  id: string;
  question: string;
  answer: string;
}

/** Groups the saved messages into question and answer pairs, newest first. */
export function toTurns(messages: ChatMessage[]): Turn[] {
  const turns: Turn[] = [];
  for (const message of messages) {
    if (message.role === "user") {
      turns.push({ id: `${turns.length}`, question: message.content, answer: "" });
    } else if (turns.length > 0) {
      const last = turns[turns.length - 1];
      last.answer = last.answer ? `${last.answer}\n\n${message.content}` : message.content;
    }
  }
  return turns.reverse();
}
