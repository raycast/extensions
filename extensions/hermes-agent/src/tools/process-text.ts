import { sendMessage } from "../api";

const OPERATION_PROMPTS = {
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
} as const;

type Operation = keyof typeof OPERATION_PROMPTS;

interface Input {
  /**
   * The text to process
   */
  text: string;
  /**
   * What to do with the text: summarize, explain, fix-grammar, improve-writing,
   * simplify, expand, translate-to-english, explain-code, review-code, bullet-points
   */
  operation: Operation;
}

/**
 * Process text with your own Hermes server: summarize, explain, fix grammar,
 * improve writing, simplify, expand, translate, or review code. Text is sent
 * to the configured Hermes endpoint (local by default).
 */
export default async function (input: Input): Promise<string> {
  const prompt = OPERATION_PROMPTS[input.operation];
  if (!prompt) {
    throw new Error(
      `Unknown operation "${input.operation}". Valid operations: ${Object.keys(OPERATION_PROMPTS).join(", ")}`,
    );
  }
  return sendMessage([
    {
      role: "user",
      content: `${prompt}\n\n${input.text}`,
    },
  ]);
}
