/** Parsed Command Mode input. See ADR-0003. */
export type ReaderCommand =
  | { kind: "toc"; filter: string }
  | { kind: "page"; page: number }
  | { kind: "chapter"; chapter: number }
  | { kind: "bookmarks" }
  | { kind: "theme"; name: string | null }
  | { kind: "search"; query: string }
  | { kind: "unknown"; input: string };

export const COMMAND_HELP = ":12 page  :c3 chapter  :toc  :bm  :theme mua  /search";

export function parseCommand(input: string): ReaderCommand {
  const text = input.trim();

  if (text.startsWith("/")) {
    return { kind: "search", query: text.slice(1).trim() };
  }

  if (!text.startsWith(":")) {
    return { kind: "toc", filter: text };
  }

  const body = text.slice(1).trim().toLowerCase();

  if (body === "" || body === "toc") {
    return { kind: "toc", filter: "" };
  }
  if (/^\d+$/.test(body)) {
    return { kind: "page", page: Number.parseInt(body, 10) };
  }
  const chapter = /^c(\d+)$/.exec(body);
  if (chapter) {
    return { kind: "chapter", chapter: Number.parseInt(chapter[1], 10) };
  }
  if (body === "bm" || body === "bookmarks") {
    return { kind: "bookmarks" };
  }
  const theme = /^theme(?:\s+(\S+))?$/.exec(body);
  if (theme) {
    return { kind: "theme", name: theme[1] ?? null };
  }

  return { kind: "unknown", input: text };
}
