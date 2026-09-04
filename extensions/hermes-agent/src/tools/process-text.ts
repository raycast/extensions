import { sendMessage } from "../api";

const OPERATION_PROMPTS: Record<string, string> = {
  summarize: "Summarize this concisely:",
  explain: "Explain this in simple terms:",
  "fix-grammar":
    "Fix the grammar and spelling, return only the corrected text:",
  "improve-writing": "Improve this writing while keeping the same meaning:",
  simplify: "Simplify this text to make it easier to understand:",
  expand: "Expand on this with more detail:",
  "translate-to-english": "Translate this to English:",
  "explain-code": "Explain what this code does:",
  "review-code": "Review this code and suggest improvements:",
  "bullet-points": "Convert this into clear bullet points:",
};

interface Input {
  /**
   * The text to process
   */
  text: string;
  /**
   * What to do with the text: summarize, explain, fix-grammar, improve-writing,
   * simplify, expand, translate-to-english, explain-code, review-code, bullet-points
   */
  operation: string;
}

/**
 * Process text with Hermes: summarize, explain, fix grammar, improve writing,
 * simplify, expand, translate, or review code. Useful for private content since
 * nothing leaves the user's machine.
 */
export default async function (input: Input): Promise<string> {
  const prompt = OPERATION_PROMPTS[input.operation] ?? `${input.operation}:`;
  return sendMessage([
    {
      role: "user",
      content: `${prompt}\n\n${input.text}`,
    },
  ]);
}
