import { encode } from "gpt-tokenizer";

export const allModels = [
  { name: "Follow global model", id: "global" },
  { name: "GPT OSS 120B 131k", id: "openai/gpt-oss-120b" },
  { name: "GPT OSS 20B 131k", id: "openai/gpt-oss-20b" },
  { name: "Qwen 3.6 27B 131k", id: "qwen/qwen3.6-27b" },
];

const MODEL_RATES: Record<string, { input: number; output: number }> = {
  "openai/gpt-oss-120b": { input: 0.15, output: 0.6 },
  "openai/gpt-oss-20b": { input: 0.075, output: 0.3 },
  "qwen/qwen3.6-27b": { input: 0.6, output: 3 },
};

export const THINKING_MODELS = ["openai/gpt-oss-120b", "openai/gpt-oss-20b", "qwen/qwen3.6-27b"] as const;

export function isThinkingModel(model: string): boolean {
  return THINKING_MODELS.includes(model as (typeof THINKING_MODELS)[number]);
}

export function buildSystemPrompt(sysPrompt: string) {
  return `You are an LLM provided by Groq.\nCurrent date: ${currentDate}.\n<goal>\n${sysPrompt}\n</goal>`;
}

export function buildUserPrompt(extraMsg?: string, selectedText?: string): string {
  const parts: string[] = [];
  if (extraMsg) parts.push(`<user_query>\n${extraMsg.trim()}\n</user_query>\n\n`);
  if (selectedText)
    parts.push(`Selected text by the user:\n<selected_text>\n${selectedText.trim()}\n</selected_text>\n\n`);
  return parts.join("");
}

function naiveRound(num: number, decimalPlaces = 0) {
  const p = Math.pow(10, decimalPlaces);
  return Math.round(num * p) / p;
}

export function estimatePrice(prompt_token: number, output_token: number, model: string) {
  const rates = MODEL_RATES[model];
  if (!rates) return 0;

  const price = (prompt_token * rates.input + output_token * rates.output) / 1_000_000;

  return naiveRound(price * 100, 5);
}

// format: Wednesday, April 24, 2024 at 5:14:26 PM GMT+2.
export const currentDate = new Date().toLocaleString("en-US", {
  timeStyle: "long",
  dateStyle: "full",
});

export function countToken(content: string) {
  return encode(content).length;
}

export function formatUserMessage(message: string): string {
  return message
    .split("\n")
    .map((line) => `>${line}`)
    .join("\n");
}
