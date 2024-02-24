import { encode } from "@nem035/gpt-3-encoder";

export const allModels = [
  { name: "Follow global model", id: "global" },
  { name: "Mixtral 8x7b Instruct", id: "mixtral-8x7b-instruct" },
  { name: "Mistral 7B Instruct", id: "mistral-7b-instruct" },
  { name: "Llama2 70B Chat", id: "llama-2-70b-chat" },
  { name: "Perplexity 7B Chat", id: "pplx-7b-chat" },
  { name: "Perplexity 70B Chat", id: "pplx-70b-chat" },
  { name: "CodeLlama 34B Instruct", id: "codellama-34b-instruct" },
  { name: "CodeLlama 70B Instruct", id: "codellama-70b-instruct" },
  { name: "Perplexity 7B Online", id: "pplx-7b-online" },
  { name: "Perplexity 70B Online", id: "pplx-70b-online" },
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

export function estimatePrice(
  prompt_token: number,
  output_token: number,
  model: string
) {
  let price = 0;
  switch (model) {
    case "pplx-7b-chat":
    case "mistral-7b-instruct":
      price =
        ((prompt_token * 0.07) / 1_000_000 +
          (output_token * 0.28) / 1_000_000) *
        100;
      break;
    case "mixtral-8x7b-instruct":
    case "pplx-8x7b-chat":
      price =
        ((prompt_token * 0.6) / 1_000_000 + (output_token * 1.8) / 1_000_000) *
        100;
      break;
    case "codellama-34b-instruct":
      price =
        ((prompt_token * 0.35) / 1_000_000 + (output_token * 1.4) / 1_000_000) *
        100;
      break;
    case "llama-2-70b-chat":
    case "codellama-70b-instruct":
    case "pplx-70b-chat":
      price =
        ((prompt_token * 0.7) / 1_000_000 + (output_token * 2.8) / 1_000_000) *
        100;
      break;
    case "pplx-7b-online":
      price = (5 / 1000 + (output_token * 0.28) / 1_000_000) * 100;
      break;
    case "pplx-8x7b-online":
      price = (5 / 1000 + (output_token * 1.8) / 1_000_000) * 100;
      break;
    case "pplx-70b-online":
      price = (5 / 1000 + (output_token * 2.8) / 1_000_000) * 100;
      break;
  }
  return naiveRound(price, 5);
}
