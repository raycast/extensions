export const DEFAULT_OTTY_CLI_PATH = "/Applications/Otty.app/Contents/MacOS/otty-cli";
export const OTTY_BUNDLE_ID = "io.appmakes.otty";

export type OttyObject = "window" | "tab" | "pane";

export function buildOpenWindowArgs(directory?: string): string[] {
  return directory ? ["open", directory] : ["open"];
}

export function buildNewTabArgs(directory?: string): string[] {
  return directory ? ["tab", "new", "--cwd", directory] : ["tab", "new"];
}

export function buildRunCommandArgs(command: string): string[] {
  return ["open", "--command", command];
}

/** `otty connect` takes ssh's own arguments; no shell is involved. */
export function buildSshCommandArgs(target: string): string[] {
  return ["connect", ...splitArguments(target.trim().replace(/^ssh:\/\//, ""))];
}

export function buildListArgs(kind: OttyObject): string[] {
  return [kind, "list", "--json"];
}

/** `pane focus` also raises the pane's window and switches to its tab. */
export function buildFocusArgs(kind: OttyObject, id: string): string[] {
  return [kind, "focus", id];
}

export function buildPaneLinkArgs(paneId: string): string[] {
  return ["pane", "link", "--pane", paneId];
}

export function buildCaptureArgs(paneId: string, lines: number): string[] {
  return ["pane", "capture", "--pane", paneId, "--lines", String(lines), "--trim"];
}

/** Queued on the pane's Prompt Queue; `--no-escape` and `--` send the text verbatim. */
export function buildSendTextArgs(paneId: string, text: string): string[] {
  return ["pane", "send-text", "--pane", paneId, "--no-escape", "--submit", "--", text];
}

export function buildJumpListArgs(count: number): string[] {
  return ["jump:ls", String(count), "--json"];
}

export function buildViewFileArgs(path: string): string[] {
  return ["view", path, "--new-tab"];
}

export function buildThemeListArgs(): string[] {
  return ["theme", "list", "--json"];
}

export function buildConfigShowArgs(): string[] {
  return ["config", "show", "--json"];
}

export function buildConfigPathArgs(): string[] {
  return ["config", "path"];
}

export function buildConfigReloadArgs(): string[] {
  return ["config", "reload"];
}

export function buildConfigGetArgs(key: string): string[] {
  return ["config", "get", key];
}

/** `--` keeps a value such as `-1` from being read as a flag. */
export function buildConfigSetArgs(key: string, value: string): string[] {
  return ["config", "set", key, "--", value];
}

export function buildConfigUnsetArgs(key: string): string[] {
  return ["config", "unset", key];
}

export function buildActivateOttyArgs(): string[] {
  return ["-b", OTTY_BUNDLE_ID];
}

export function buildFinderDirectoryScriptArgs(): string[] {
  return [
    "-e",
    'tell application "Finder"',
    "-e",
    "if (count of Finder windows) > 0 then",
    "-e",
    "POSIX path of (target of front Finder window as alias)",
    "-e",
    "else",
    "-e",
    "POSIX path of (desktop as alias)",
    "-e",
    "end if",
    "-e",
    "end tell",
  ];
}

const DOUBLE_QUOTE_ESCAPES = new Set(['"', "\\", "$", "`", "\n"]);

export function splitArguments(input: string): string[] {
  const args: string[] = [];
  let current = "";
  let quote: string | undefined;
  let inArgument = false;
  let escaped = false;
  for (const char of input) {
    if (escaped) {
      // Inside "…" a shell escapes only " \ $ ` and a newline; elsewhere \
      // escapes anything.
      if (quote === '"' && !DOUBLE_QUOTE_ESCAPES.has(char)) current += "\\";
      current += char;
      escaped = false;
      inArgument = true;
    } else if (char === "\\" && quote !== "'") {
      escaped = true;
    } else if (quote) {
      if (char === quote) quote = undefined;
      else current += char;
    } else if (char === '"' || char === "'") {
      quote = char;
      inArgument = true;
    } else if (/\s/.test(char)) {
      if (inArgument) args.push(current);
      current = "";
      inArgument = false;
    } else {
      current += char;
      inArgument = true;
    }
  }
  if (quote) throw new Error("Unmatched quote in the SSH arguments.");
  if (escaped) {
    current += "\\";
    inArgument = true;
  }
  if (inArgument) args.push(current);
  return args;
}

export function parseOttyJson<T>(stdout: string): T {
  let envelope: { ok?: boolean; data?: T; error?: unknown };
  try {
    envelope = JSON.parse(stdout);
  } catch {
    throw new Error(`Unexpected output from Otty CLI: ${stdout.slice(0, 200)}`);
  }
  if (envelope.ok === false) {
    throw new Error(
      typeof envelope.error === "string"
        ? envelope.error
        : JSON.stringify(envelope.error ?? "Otty CLI reported an error"),
    );
  }
  return envelope.data as T;
}

export function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export type JumpEntry = {
  path: string;
  /** Seconds since the epoch. */
  last_seen: number;
  score: number;
  /** The accumulated visit count before Otty's age bucket is applied. */
  raw_score?: number;
};

const VISIT_HALF_LIFE_SECONDS = 7 * 24 * 60 * 60;

/**
 * Otty's `score` divides a folder's visits by at most 4 once it's a week old, so
 * one that was busy (or imported from zoxide) months ago outranks this week's
 * folders forever. Halving the weight of visits every week keeps the list current.
 */
export function rankByRecentVisits<T extends JumpEntry>(entries: T[], nowSeconds: number): T[] {
  const weight = (entry: T) =>
    (entry.raw_score ?? entry.score) * 0.5 ** (Math.max(0, nowSeconds - entry.last_seen) / VISIT_HALF_LIFE_SECONDS);
  const weights = new Map(entries.map((entry) => [entry, weight(entry)]));
  return [...entries].sort(
    (a, b) =>
      (weights.get(b) ?? 0) - (weights.get(a) ?? 0) || b.last_seen - a.last_seen || a.path.localeCompare(b.path),
  );
}

export function splitPinned<T extends { path: string }>(
  entries: T[],
  pinnedPaths: string[],
): { pinned: (T | { path: string })[]; others: T[] } {
  const byPath = new Map(entries.map((entry) => [entry.path, entry]));
  const pinnedSet = new Set(pinnedPaths);
  return {
    pinned: pinnedPaths.map((path) => byPath.get(path) ?? { path }),
    others: entries.filter((entry) => !pinnedSet.has(entry.path)),
  };
}
