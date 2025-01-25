import { encode } from "gpt-tokenizer";

export const allModels = [
  { name: "Follow global model", id: "global" },
  { name: "Sonar Pro 200k", id: "sonar-pro" },
  { name: "Sonar 128k", id: "sonar" },
  { name: "Llama 3.3 70B 128k", id: "llama-3.3-70b-instruct" },
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
    case "llama-3.3-70b-instruct":
      price = ((prompt_token * 1) / 1_000_000 + (output_token * 1) / 1_000_000) * 100;
      break;
    case "sonar":
      price = (5 / 1000 + (prompt_token * 1) / 1_000_000 + (output_token * 1) / 1_000_000) * 100;
      break;
    case "sonar-pro":
      price = (5 / 1000 + (prompt_token * 3) / 1_000_000 + (output_token * 15) / 1_000_000) * 100;
      break;
  }
  return naiveRound(price, 5);
}
