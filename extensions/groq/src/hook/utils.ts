import { encode } from "gpt-tokenizer";

export const allModels = [
  { name: "Follow global model", id: "global" },
  { name: "Llama 4 Scout 131k", id: "meta-llama/llama-4-scout-17b-16e-instruct" },
  { name: "Llama 4 Maverick 131k", id: "meta-llama/llama-4-maverick-17b-128e-instruct" },
  { name: "DeepSeek R1 70B 128k", id: "deepseek-r1-distill-llama-70b" },
  { name: "DeepSeek R1 32B 128K", id: "deepseek-r1-distill-qwen-32b" },
  { name: "Llama 3.3 70B 128k", id: "llama-3.3-70b-versatile" },
  { name: "Llama 3.3 70B SpecDec 8k", id: "llama-3.3-70b-specdec" },
  { name: "Llama 3.1 8B 128k", id: "llama-3.1-8b-instant" },
  { name: "Llama 3 70B 8k", id: "llama3-70b-8192" },
  { name: "Llama 3 8B 8k", id: "llama3-8b-8192" },
  { name: "Gemma2 9B 8k", id: "gemma2-9b-it" },
  { name: "Mistral Saba 24B 32K", id: "mistral-saba-24b" },
  { name: "Qwen 2.5 32B 128K", id: "qwen-2.5-32b" },
  { name: "Qwen 2.5 Coder 32B 128K", id: "qwen-2.5-coder-32b" },
  { name: "Qwen QWQ 32B 128K", id: "qwen-qwq-32b" },
];

// format: Wednesday, April 24, 2024 at 5:14:26 PM GMT+2.
export const currentDate = new Date().toLocaleString("en-US", {
  timeStyle: "long",
  dateStyle: "full",
});

function naiveRound(num: number, decimalPlaces = 0) {
  const p = Math.pow(10, decimalPlaces);
  return Math.round(num * p) / p;
}

export function countToken(content: string) {
  return encode(content).length;
}

export function estimatePrice(prompt_token: number, output_token: number, model: string) {
  let price = 0;
  switch (model) {
    case "meta-llama/llama-4-scout-17b-16e-instruct":
      price = ((prompt_token * 0.11) / 1_000_000 + (output_token * 0.34) / 1_000_000) * 100;
      break;
    case "meta-llama/llama-4-maverick-17b-128e-instruct":
      price = ((prompt_token * 0.5) / 1_000_000 + (output_token * 0.77) / 1_000_000) * 100;
      break;
    case "deepseek-r1-distill-llama-70b":
      price = ((prompt_token * 0.75) / 1_000_000 + (output_token * 0.99) / 1_000_000) * 100;
      break;
    case "deepseek-r1-distill-qwen-32b":
      price = ((prompt_token * 0.69) / 1_000_000 + (output_token * 0.69) / 1_000_000) * 100;
      break;
    case "llama3-70b-8192":
    case "llama-3.3-70b-versatile":
      price = ((prompt_token * 0.59) / 1_000_000 + (output_token * 0.79) / 1_000_000) * 100;
      break;
    case "llama-3.3-70b-specdec":
      price = ((prompt_token * 0.59) / 1_000_000 + (output_token * 0.99) / 1_000_000) * 100;
      break;
    case "llama3-8b-8192":
    case "llama-3.1-8b-instant":
      price = ((prompt_token * 0.05) / 1_000_000 + (output_token * 0.08) / 1_000_000) * 100;
      break;
    case "gemma-9b-it":
      price = ((prompt_token * 0.2) / 1_000_000 + (output_token * 0.2) / 1_000_000) * 100;
      break;
    case "mistral-saba-24b":
      price = ((prompt_token * 0.79) / 1_000_000 + (output_token * 0.79) / 1_000_000) * 100;
      break;
    case "qwen-2.5-32b":
    case "qwen-2.5-coder-32b":
      price = ((prompt_token * 0.79) / 1_000_000 + (output_token * 0.79) / 1_000_000) * 100;
      break;
    case "qwen-qwq-32b":
      price = ((prompt_token * 0.29) / 1_000_000 + (output_token * 0.39) / 1_000_000) * 100;
      break;
  }
  return naiveRound(price, 5);
}
