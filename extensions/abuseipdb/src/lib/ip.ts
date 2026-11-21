import { isIP } from "net";

/** Strip wrapping punctuation, sentence punctuation and a trailing port from a token. */
function normalise(token: string): string {
  const trimmed = token.trim().replace(/^[<("'\s]+|[>)"'\s,;.!?]+$/g, "");

  // [2001:db8::1]:443 -> 2001:db8::1
  const bracketed = trimmed.match(/^\[([^\]]+)\](?::\d+)?$/);
  if (bracketed) {
    return bracketed[1];
  }

  let candidate = trimmed.replace(/^\[+|\]+$/g, "");

  // 1.2.3.4:8080 -> 1.2.3.4 (never applied to bare IPv6, which is full of colons)
  if ((candidate.match(/:/g)?.length ?? 0) === 1) {
    candidate = candidate.split(":")[0];
  }

  return candidate;
}

export function isValidIp(value: string): boolean {
  return isIP(value) !== 0;
}

/** Returns the first valid IP address found in arbitrary text, or undefined. */
export function extractIp(text: string): string | undefined {
  if (!text) {
    return undefined;
  }

  for (const token of text.split(/[\s,;|]+/)) {
    const candidate = normalise(token);
    if (isValidIp(candidate)) {
      return candidate;
    }
  }

  return undefined;
}
