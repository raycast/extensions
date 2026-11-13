import { parseTweet } from "twitter-text";

export function postLength(text: string): number {
  return parseTweet(text.trim()).weightedLength;
}

export function validatePostLength(text: string): void {
  const weightedLength = postLength(text);
  if (weightedLength > 280) throw new Error(`Post length is ${weightedLength}; X allows up to 280.`);
}
