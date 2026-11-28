import { encode } from "gpt-tokenizer";

export const allModels = [
  { name: "Follow global model", id: "global" },
  { name: "Fast", id: "fast" },
  { name: "Low", id: "low" },
  { name: "Medium", id: "medium" },
  { name: "High (Deep Research)", id: "high" },
  { name: "Extra High", id: "xhigh" },
  { name: "GPT-5.6 Sol", id: "openai/gpt-5.6-sol" },
  { name: "GPT-5.6 Luna", id: "openai/gpt-5.6-luna" },
];

// format: Wednesday, April 24, 2024 at 5:14:26 PM GMT+2.
export const currentDate = new Date().toLocaleString("en-US", {
  timeStyle: "long",
  dateStyle: "full",
});

export function countToken(content: string) {
  return encode(content).length;
}
