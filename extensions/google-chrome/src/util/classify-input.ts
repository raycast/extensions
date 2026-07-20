import { URL } from "url";

export interface ClassifiedInput {
  type: "url" | "search";
  value: string;
}

/**
 * Distinguishes between a URL and a search term based on common patterns.
 *
 * @param input Input string.
 * @returns An object indicating whether it's a 'url' or 'search' and the corresponding value.
 */
export function classifyInput(input: string): ClassifiedInput {
  const trimmedInput = input.trim();

  if (!trimmedInput) {
    return { type: "search", value: trimmedInput };
  }

  // http or https scheme
  if (trimmedInput.startsWith("http://") || trimmedInput.startsWith("https://")) {
    try {
      new URL(trimmedInput);
      return { type: "url", value: trimmedInput };
    } catch {
      return { type: "search", value: trimmedInput };
    }
  }

  // IPv4 address (potentially with port)
  const ipv4Regex =
    /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)(?::\d+)?$/;
  if (ipv4Regex.test(trimmedInput)) {
    return { type: "url", value: `https://${trimmedInput}` };
  }

  // localhost (potentially with port)
  const localhostRegex = /^localhost(?::\d+)?$/i;
  if (localhostRegex.test(trimmedInput)) {
    return { type: "url", value: `http://${trimmedInput}` };
  }

  // domain-like structure heuristic:
  //    - Contains at least one dot
  //    - Does not contain spaces
  //    - Does not end with a dot
  //    - The TLD part has 2 or more characters
  //    - The part before the first dot is not empty
  if (trimmedInput.includes(".") && !/\s/.test(trimmedInput) && !trimmedInput.endsWith(".")) {
    const parts = trimmedInput.split(".");
    const tld = parts[parts.length - 1];
    const domainPart = parts[0];
    if (parts.length > 1 && tld.length >= 2 && domainPart.length > 0) {
      return { type: "url", value: `https://${trimmedInput}` };
    }
  }

  return { type: "search", value: trimmedInput };
}
