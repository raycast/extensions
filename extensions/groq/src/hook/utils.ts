import { encode } from "gpt-tokenizer";

export const allModels = [
  { name: "Follow global model", id: "global" },
  { name: "DeepSeek R1 70B 128k", id: "deepseek-r1-distill-llama-70b" },
  { name: "Llama 3.3 70B 128k", id: "llama-3.3-70b-versatile" },
  { name: "Llama 3.3 70B SpecDec 8k", id: "llama-3.3-70b-specdec" },
  { name: "Llama 3.1 8B 128k", id: "llama-3.1-8b-instant" },
  { name: "Llama 3 70B 8k", id: "llama3-70b-8192" },
  { name: "Llama 3 8B 8k", id: "llama3-8b-8192" },
  { name: "Gemma2 9B 8k", id: "gemma2-9b-it" },
  { name: "Mixtral 8x7B 32k", id: "mixtral-8x7b-32768" },
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
    case "deepseek-r1-distill-llama-70b":
      price = ((prompt_token * 3) / 1_000_000 + (output_token * 3) / 1_000_000) * 100;
      break;
    case "mixtral-8x7b-32768":
      price = ((prompt_token * 0.24) / 1_000_000 + (output_token * 0.24) / 1_000_000) * 100;
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
  }
  return naiveRound(price, 5);
}
