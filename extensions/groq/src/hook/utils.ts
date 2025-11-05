import { encode } from "gpt-tokenizer";

export const allModels = [
  { name: "Follow global model", id: "global" },
  { name: "GPT OSS 120B 131k", id: "openai/gpt-oss-120b" },
  { name: "GPT OSS 20B 131k", id: "openai/gpt-oss-20b" },
  { name: "Kimi K2 Instruct 128k", id: "moonshotai/kimi-k2-instruct" },
  { name: "Qwen 3 32B 128k", id: "qwen/qwen3-32b" },
  { name: "Llama 4 Maverick 131k", id: "meta-llama/llama-4-maverick-17b-128e-instruct" },
  { name: "Llama 4 Scout 131k", id: "meta-llama/llama-4-scout-17b-16e-instruct" },
  { name: "Llama 3.3 70B 128k", id: "llama-3.3-70b-versatile" },
  { name: "Llama 3.1 8B 128k", id: "llama-3.1-8b-instant" },
  { name: "DeepSeek R1 70B 128k", id: "deepseek-r1-distill-llama-70b" },
];

const MODEL_RATES: Record<string, { input: number; output: number }> = {
  "openai/gpt-oss-120b": { input: 0.15, output: 0.75 },
  "openai/gpt-oss-20b": { input: 0.1, output: 0.5 },
  "meta-llama/llama-4-scout-17b-16e-instruct": { input: 0.11, output: 0.34 },
  "meta-llama/llama-4-maverick-17b-128e-instruct": { input: 0.2, output: 0.6 },
  "deepseek-r1-distill-llama-70b": { input: 0.75, output: 0.99 },
  "llama-3.3-70b-versatile": { input: 0.59, output: 0.79 },
  "llama-3.1-8b-instant": { input: 0.05, output: 0.08 },
  "qwen/qwen3-32b": { input: 0.29, output: 0.59 },
  "moonshotai/kimi-k2-instruct": { input: 1.0, output: 3.0 },
};

export const THINKING_MODELS = [
  "openai/gpt-oss-120b",
  "openai/gpt-oss-20b",
  "deepseek-r1-distill-llama-70b",
  "qwen/qwen3-32b",
] as const;

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
