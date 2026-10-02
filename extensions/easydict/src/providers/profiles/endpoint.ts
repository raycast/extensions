/* Copyright (c) 2022~present by tisfeng, maxchang3, All Rights Reserved. */

/**
 * Normalize an OpenAI-compatible base URL: trim whitespace, drop a trailing
 * `/chat/completions` some users paste in full, and strip trailing slashes so
 * the client can append its own path.
 */
export function normalizeOpenAICompatibleEndpoint(endpoint: string): string {
  return endpoint
    .trim()
    .replace(/\/chat\/completions\/?$/, "")
    .replace(/\/+$/, "");
}
