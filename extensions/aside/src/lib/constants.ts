import { homedir } from "os";
import { join } from "path";

// Bundle id for Aside. Centralized so commands don't repeat the literal.
export const ASIDE_BUNDLE_ID = "at.studio.AsideBrowser";

// Aside uses Chromium's user-data layout under its Application Support folder.
export const ASIDE_USER_DATA_DIR = join(homedir(), "Library", "Application Support", "Aside");

export function resolveAsideProfile(profile?: string): string {
  const directory = profile?.trim();
  if (
    !directory ||
    directory === "." ||
    directory === ".." ||
    directory.includes("/") ||
    directory.includes("\\") ||
    directory.includes("\0")
  ) {
    return "Default";
  }
  return directory;
}

export const APPLESCRIPT_TIMEOUT_MS = 5000;

// Google-only search config. If you ever want to swap engines, change these
// three constants together: `searchUrl` for navigation, `suggestionsUrl` for
// the dropdown, `parseSuggestions` for the response shape.
export const SEARCH = {
  name: "Google",
  searchUrl: "https://www.google.com/search?q=",
  suggestionsUrl: "https://suggestqueries.google.com/complete/search?hl=en-us&output=chrome&q=",
} as const;

// Google's chrome-format payload: [query, [suggestions], [descriptions], [], metadata]
export function parseSuggestions(json: unknown): string[] {
  return Array.isArray(json) && Array.isArray(json[1])
    ? json[1].filter((suggestion): suggestion is string => typeof suggestion === "string")
    : [];
}
