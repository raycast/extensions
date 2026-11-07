import { LocalizedError } from "./i18n/messages.ts";

export type ShareRequest =
  { kind: "text"; text: string } | { kind: "files"; paths: string[] };

export function textRequest(text: string | undefined): ShareRequest {
  if (!text || !text.trim()) throw new LocalizedError("emptyText");
  // Preserve original whitespace, Unicode and multiline content.
  return { kind: "text", text };
}

export function filesRequest(paths: string[]): ShareRequest {
  if (paths.length === 0) throw new LocalizedError("filesRequired");
  if (paths.some((path) => !path.startsWith("/") || path.includes("\0"))) {
    throw new LocalizedError("invalidPaths");
  }
  return { kind: "files", paths: [...new Set(paths)] };
}
