import { encode } from "@nem035/gpt-3-encoder";

export const currentDate = new Date().toLocaleString("en-US", {
  weekday: "long",
  year: "numeric",
  month: "long",
  day: "numeric",
});

export function countToken(content: string) {
  return encode(content).length;
}
