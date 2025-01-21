import { encode } from "gpt-tokenizer";

export const allModels = [
  { name: "Follow global model", id: "global" },
  { name: "Llama 3.3 70B 128k", id: "llama-3.3-70b-instruct" },
  { name: "Sonar Large 70B 128k", id: "llama-3.1-sonar-large-128k-chat" },
  { name: "Sonar Small 8B 128k", id: "llama-3.1-sonar-small-128k-chat" },
  { name: "Sonar Huge 405B Online", id: "llama-3.1-sonar-huge-128k-online" },
  { name: "Sonar Large 70B Online", id: "llama-3.1-sonar-large-128k-online" },
  { name: "Sonar Small 8B Online", id: "llama-3.1-sonar-small-128k-online" },
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
    case "llama-3.1-sonar-small-128k-chat":
      price = ((prompt_token * 0.2) / 1_000_000 + (output_token * 0.2) / 1_000_000) * 100;
      break;
    case "llama-3.1-sonar-large-128k-chat":
    case "llama-3.3-70b-instruct":
      price = ((prompt_token * 1) / 1_000_000 + (output_token * 1) / 1_000_000) * 100;
      break;
    case "llama-3.1-sonar-small-128k-online":
      price = (5 / 1000 + (prompt_token * 0.2) / 1_000_000 + (output_token * 0.2) / 1_000_000) * 100;
      break;
    case "llama-3.1-sonar-large-128k-online":
      price = (5 / 1000 + (prompt_token * 1) / 1_000_000 + (output_token * 1) / 1_000_000) * 100;
      break;
    case "llama-3.1-sonar-huge-128k-online":
      price = (5 / 1000 + (prompt_token * 5) / 1_000_000 + (output_token * 5) / 1_000_000) * 100;
      break;
  }
  return naiveRound(price, 5);
}
