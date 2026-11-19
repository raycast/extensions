import type { Post } from "@xeet/core";

export const MAX_INPUT_BYTES = 32 * 1024 * 1024;
const POST_HOSTS = new Set([
  "x.com",
  "www.x.com",
  "mobile.x.com",
  "twitter.com",
  "www.twitter.com",
  "mobile.twitter.com",
]);

export type PostInput = { type: "url"; url: string } | { type: "post"; post: Post };

export function normalizePostUrl(input: string): string {
  let url: URL;
  try {
    url = new URL(input);
  } catch {
    throw new Error("Enter a complete https://x.com/handle/status/123 URL.");
  }
  const match = /^\/(?:[A-Za-z0-9_]{1,15}|i\/web|i)\/status\/(\d{1,20})(?:\/(?:photo|video)\/[1-4])?\/?$/.exec(
    url.pathname,
  );
  if (
    url.protocol !== "https:" ||
    url.username ||
    url.password ||
    url.port ||
    !POST_HOSTS.has(url.hostname) ||
    !match
  ) {
    throw new Error("Use a public HTTPS post URL from x.com or twitter.com, including /status/ and its numeric ID.");
  }
  return `https://x.com/i/status/${match[1]}`;
}

export function detectInput(input: string): PostInput {
  const trimmed = input.trim();
  if (!trimmed) throw new Error("Enter post text, a public X post URL, or a Xeet Post JSON object.");
  if (Buffer.byteLength(input) > MAX_INPUT_BYTES) throw new Error("Input is too large. Keep post JSON below 32 MB.");
  if (/^(?:https?:\/\/|(?:www\.)?(?:x|twitter)\.com\/)/i.test(trimmed) && !/\s/.test(trimmed)) {
    return { type: "url", url: normalizePostUrl(trimmed) };
  }
  if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
    let value: unknown;
    try {
      value = JSON.parse(trimmed);
    } catch {
      throw new Error(
        "Invalid JSON. Paste a Xeet Post object with a text field, or use Create Post Preview for literal text.",
      );
    }
    if (
      !value ||
      typeof value !== "object" ||
      Array.isArray(value) ||
      !("text" in value) ||
      typeof value.text !== "string"
    ) {
      throw new Error('Post JSON must be an object with a string "text" field.');
    }
    return { type: "post", post: value as Post };
  }
  return { type: "post", post: { text: input } };
}
