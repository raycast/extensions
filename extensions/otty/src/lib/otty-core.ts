export const DEFAULT_OTTY_CLI_PATH = "/Applications/Otty.app/Contents/MacOS/otty-cli";

export function buildOpenDirectoryArgs(directory: string): string[] {
  return ["open", directory];
}

export function buildOpenDirectoryTabArgs(directory: string): string[] {
  return ["tab", "new", "--cwd", directory];
}

export function buildRunCommandArgs(command: string): string[] {
  return ["open", "--command", command];
}

/** `otty connect` takes ssh's own arguments; no shell is involved. */
export function buildSshCommandArgs(target: string): string[] {
  return ["connect", ...splitArguments(normalizeSshTarget(target))];
}

/**
 * Split on whitespace like a shell would, keeping '…' and "…" together and
 * honoring backslash escapes, without running one. Throws on an unmatched quote
 * rather than guessing.
 */
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

/** Strip an optional `ssh://` prefix and trim whitespace. */
export function normalizeSshTarget(input: string): string {
  return input.trim().replace(/^ssh:\/\//, "");
}

export type JumpEntry = {
  path: string;
  /** Seconds since the epoch. */
  last_seen: number;
  score: number;
};

export function buildJumpListArgs(count: number): string[] {
  return ["jump:ls", String(count), "--json"];
}

/**
 * Pinned folders first, in pin order, then everything else. A pinned folder that
 * is missing from `entries` (it left the jump history) keeps just its path.
 */
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

/** Open a file read-only in Otty's built-in viewer, in a new tab. */
export function buildViewFileArgs(path: string): string[] {
  return ["view", path, "--new-tab"];
}
