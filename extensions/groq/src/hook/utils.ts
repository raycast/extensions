import { encode } from "@nem035/gpt-3-encoder";

export const allModels = [
  { name: "Follow global model", id: "global" },
  { name: "Llama3 8B 8k", id: "llama3-8b-8192" },
  { name: "Llama3 70B 8k", id: "llama3-70b-8192" },
  { name: "Mixtral 8x7B 32k", id: "mixtral-8x7b-32768" },
  { name: "Gemma 7B 8k", id: "gemma-7b-it" },
];

export const currentDate = new Date().toLocaleString("en-US", {
  weekday: "long",
  year: "numeric",
  month: "long",
  day: "numeric",
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
    case "mixtral-8x7b-32768":
      price = ((prompt_token * 0.27) / 1_000_000 + (output_token * 0.27) / 1_000_000) * 100;
      break;
    case "llama3-70b-8192":
      price = ((prompt_token * 0.59) / 1_000_000 + (output_token * 0.79) / 1_000_000) * 100;
      break;
    case "llama3-8b-8192":
      price = ((prompt_token * 0.05) / 1_000_000 + (output_token * 0.1) / 1_000_000) * 100;
      break;
    case "gemma-7b-it":
      price = ((prompt_token * 0.1) / 1_000_000 + (output_token * 0.1) / 1_000_000) * 100;
      break;
  }
  return naiveRound(price, 5);
}
