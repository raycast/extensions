import { createHash } from "node:crypto";

export function analysisCacheKey(
  text: string,
  provider: string,
  accent: string,
  model = "",
): string {
  return createHash("sha1")
    .update(`${provider} ${model} ${accent} ${text.trim()}`)
    .digest("hex")
    .slice(0, 20);
}
