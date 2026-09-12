import { encode } from "@nem035/gpt-3-encoder";
import { BrowserExtension } from "@raycast/api";
import { ContentFormat } from "../components/ResultView.types";

export const allModels = [
  { name: "Follow global model", id: "global" },
  { name: "Sonar Small 7B 32k", id: "llama-3-sonar-small-32k-chat" },
  { name: "Sonar Large 8x7B 32k", id: "llama-3-sonar-large-32k-chat" },
  { name: "Sonar Small 7B Online", id: "llama-3-sonar-small-32k-online" },
  { name: "Sonar Large 8x7B Online", id: "llama-3-sonar-large-32k-online" },
  { name: "Llama3 70B 8k", id: "llama-3-70b-instruct" },
  { name: "Llama3 8B 8k", id: "llama-3-8b-instruct" },
  { name: "Mixtral 8x22B 16k", id: "mixtral-8x22b-instruct" },
  { name: "Mixtral 8x7B 16k", id: "mixtral-8x7b-instruct" },
];

export const getBrowserContent = async ({ format = "markdown" }: { format?: ContentFormat }) => {
  return await BrowserExtension.getContent({ format: format });
};

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
    case "llama-3-sonar-small-32k-chat":
    case "llama-3-8b-instruct":
      price = ((prompt_token * 0.2) / 1_000_000 + (output_token * 0.2) / 1_000_000) * 100;
      break;
    case "mixtral-8x7b-instruct":
    case "llama-3-sonar-large-32k-chat":
      price = ((prompt_token * 0.6) / 1_000_000 + (output_token * 0.6) / 1_000_000) * 100;
      break;
    case "llama-3-70b-instruct":
    case "mixtral-8x22b-instruct":
      price = ((prompt_token * 1) / 1_000_000 + (output_token * 1) / 1_000_000) * 100;
      break;
    case "llama-3-sonar-small-32k-online":
      price = (5 / 1000 + (output_token * 0.2) / 1_000_000) * 100;
      break;
    case "llama-3-sonar-large-32k-online":
      price = (5 / 1000 + (output_token * 0.6) / 1_000_000) * 100;
      break;
    default:
      break;
  }
  return naiveRound(price, 5);
}
