import { encode } from "@nem035/gpt-3-encoder";

export const allModels = [
  { name: "Follow global model", id: "global" },
  { name: "Mixtral 8x7b 16k", id: "mixtral-8x7b-instruct" },
  { name: "Mistral 7B 16k", id: "mistral-7b-instruct" },
  { name: "Sonar small 7B 16k", id: "sonar-small-chat" },
  { name: "Sonar medium 8x7B 16k", id: "sonar-medium-chat" },
  { name: "CodeLlama 70B 16k", id: "codellama-70b-instruct" },
  { name: "Sonar small 7B Online", id: "sonar-small-online" },
  { name: "Sonar medium 8x7B Online", id: "sonar-medium-online" },
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
    case "sonar-small-chat":
    case "mistral-7b-instruct":
      price = ((prompt_token * 0.2) / 1_000_000 + (output_token * 0.2) / 1_000_000) * 100;
      break;
    case "mixtral-8x7b-instruct":
    case "sonar-medium-chat":
      price = ((prompt_token * 0.6) / 1_000_000 + (output_token * 0.6) / 1_000_000) * 100;
      break;
    case "codellama-70b-instruct":
      price = ((prompt_token * 1) / 1_000_000 + (output_token * 1) / 1_000_000) * 100;
      break;
    case "sonar-small-online":
      price = (5 / 1000 + (output_token * 0.2) / 1_000_000) * 100;
      break;
    case "sonar-medium-online":
      price = (5 / 1000 + (output_token * 0.6) / 1_000_000) * 100;
      break;
  }
  return naiveRound(price, 5);
}
