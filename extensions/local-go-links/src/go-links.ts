import { homedir } from "node:os";
import { join } from "node:path";
import { readFile } from "node:fs/promises";
import { getPreferenceValues } from "@raycast/api";

export type GoLinksFile = Record<string, string>;

export type Preferences = {
  goLinksFile: string;
};

export class GoLinksError extends Error {
  constructor(
    public code:
      | "missing_file"
      | "read_error"
      | "malformed_json"
      | "invalid_shape"
      | "invalid_entry",
    message: string,
  ) {
    super(message);
    this.name = "GoLinksError";
  }
}

export function expandHome(filePath: string): string {
  if (filePath === "~") {
    return homedir();
  }
  if (filePath.startsWith("~/")) {
    return join(homedir(), filePath.slice(2));
  }
  return filePath;
}

export function getGoLinksPath(): string {
  const prefs = getPreferenceValues<Preferences>();
  const raw = prefs.goLinksFile?.trim() || "~/go-links.json";
  return expandHome(raw);
}

export async function loadGoLinks(): Promise<GoLinksFile> {
  const path = getGoLinksPath();

  let content: string;
  try {
    content = await readFile(path, "utf8");
  } catch (err) {
    const code = (err as NodeJS.ErrnoException).code;
    if (code === "ENOENT") {
      throw new GoLinksError(
        "missing_file",
        `Local go-links file not found at ${path}. Create it with a JSON object of aliases.`,
      );
    }
    throw new GoLinksError(
      "read_error",
      `Could not read ${path}: ${(err as Error).message}`,
    );
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch (err) {
    throw new GoLinksError(
      "malformed_json",
      `Local go-links file at ${path} is not valid JSON: ${(err as Error).message}`,
    );
  }

  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    throw new GoLinksError(
      "invalid_shape",
      `Local go-links file at ${path} must be a JSON object mapping aliases to URLs.`,
    );
  }

  const result: GoLinksFile = {};
  for (const [key, value] of Object.entries(parsed)) {
    if (typeof value !== "string") {
      throw new GoLinksError(
        "invalid_entry",
        `Alias "${key}" must map to a string URL.`,
      );
    }
    result[key] = value;
  }
  return result;
}

const PLACEHOLDER = /\{(\d+)\}/g;

export type ResolveResult =
  | { kind: "ok"; url: string }
  | { kind: "missing-args"; needed: number[]; provided: number };

export function resolveTemplate(
  template: string,
  args: string[],
): ResolveResult {
  const missing = new Set<number>();
  const filled = template.replace(PLACEHOLDER, (match, indexStr: string) => {
    const idx = Number(indexStr);
    if (idx >= args.length) {
      missing.add(idx);
      return match;
    }
    return encodeURIComponent(args[idx]);
  });

  if (missing.size > 0) {
    return {
      kind: "missing-args",
      needed: [...missing].sort((a, b) => a - b),
      provided: args.length,
    };
  }
  return { kind: "ok", url: filled };
}

export function isHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

export function splitQuery(query: string): { alias: string; args: string[] } {
  const tokens = query
    .trim()
    .split(/\s+/)
    .filter((t) => t.length > 0);
  const [alias, ...args] = tokens;
  return { alias: alias ?? "", args };
}
