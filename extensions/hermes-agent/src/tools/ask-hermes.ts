import { askQuestion, sendMessage } from "../api";

interface Input {
  /**
   * The question or instruction to send to Hermes
   */
  question: string;
  /**
   * Optional conversation history for multi-turn context, oldest first
   */
  history?: { role: "user" | "assistant"; content: string }[];
}

/**
 * Ask the local Hermes Agent a question and return its answer.
 * Use for general Q&A, explanations, brainstorming, and advice.
 */
export default async function (input: Input): Promise<string> {
  const history = input.history ?? [];
  const messages = [
    ...history,
    { role: "user" as const, content: input.question },
  ];

  if (history.length === 0) {
    return askQuestion(input.question);
  }

  return sendMessage(messages);
}
