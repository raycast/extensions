import { encode } from "@nem035/gpt-3-encoder";

export const allModels = [
  { name: "Follow global model", id: "global" },
  { name: "Mixtral 8x7b 32k", id: "mixtral-8x7b-32768" },
  { name: "Llama2 70B 4k", id: "llama2-70b-4096" },
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
    case "llama2-70b-4096":
      price = ((prompt_token * 0.7) / 1_000_000 + (output_token * 0.8) / 1_000_000) * 100;
      break;
  }
  return naiveRound(price, 5);
}
