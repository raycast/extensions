import { readTmuxConfigs } from "./tmuxConfig";

// Matches bind-key / bind lines.
// Examples:
//   bind-key v split-window -v
//   bind -r H resize-pane -L 5
//   bind-key -N "Split vertical" v split-window -v
const BIND_PATTERN = /^\s*bind(?:-key)?\s+(.+)/;

// Flags that consume the next token as an argument
const ARG_FLAGS = new Set(["-c", "-t", "-s", "-n", "-N", "-p", "-F", "-f"]);

/**
 * Normalizes a tmux command to a signature for matching.
 * Strips working-dir flags, numeric args, placeholders, quoted strings,
 * and stops at command chains (\;).
 *
 * Examples:
 *   "split-window -v -c '#{pane_current_path}'" → "split-window -v"
 *   "resize-pane -L 3" → "resize-pane -L"
 *   "source-file ~/.tmux.conf \; display 'done'" → "source-file ~/.tmux.conf"
 */
export function commandSignature(fullCmd: string): string {
  const tokens = fullCmd.split(/\s+/);
  const parts: string[] = [];

  let i = 0;
  while (i < tokens.length) {
    const token = tokens[i];

    // Stop at command chains
    if (token === "\\;" || token === ";") break;

    // Skip flags that take an argument (and skip the argument too)
    if (ARG_FLAGS.has(token)) {
      i += 2;
      continue;
    }

    // Skip -k (kill) and -r (repeat) — behavioral flags not part of identity
    if (token === "-k" || token === "-r") {
      i++;
      continue;
    }

    // Skip quoted strings
    if (token.startsWith('"') || token.startsWith("'") || token.startsWith("#{")) {
      i++;
      continue;
    }

    // Skip pure numeric arguments (resize amounts, etc.)
    if (/^\d+$/.test(token)) {
      i++;
      continue;
    }

    // Skip placeholder tokens like <session_name>
    if (token.startsWith("<") && token.endsWith(">")) {
      i++;
      continue;
    }

    parts.push(token);
    i++;
  }

  return parts.join(" ");
}

function parseLine(args: string): { key: string; command: string } | undefined {
  const tokens = args.split(/\s+/);
  let i = 0;

  // Skip optional flags before the key
  while (i < tokens.length) {
    const token = tokens[i];
    if (token === "-r") {
      // Repeatable flag — skip
      i++;
    } else if (token === "-n") {
      // Root table binding (no prefix) — skip the whole line
      return undefined;
    } else if (token === "-T") {
      // Explicit table — only keep prefix table bindings
      i++;
      const table = tokens[i];
      if (table !== "prefix") {
        return undefined;
      }
      i++;
    } else if (token === "-N") {
      // Note flag — skip the quoted or unquoted note
      i++;
      if (i < tokens.length && tokens[i].startsWith('"')) {
        // Consume until closing quote
        while (i < tokens.length && !tokens[i].endsWith('"')) {
          i++;
        }
        i++; // skip past closing-quote token
      } else {
        i++; // single-word note
      }
    } else {
      break;
    }
  }

  if (i >= tokens.length) {
    return undefined;
  }

  const key = tokens[i];
  i++;

  if (i >= tokens.length) {
    return undefined;
  }

  const command = tokens.slice(i).join(" ");
  return { key, command };
}

/**
 * Reads tmux config files and returns a map of normalized command signatures
 * (e.g. "split-window -v") to bound keys (e.g. "|").
 * Last binding wins, matching tmux behavior.
 */
export function detectKeyBindings(): ReadonlyMap<string, string> {
  const bindings = new Map<string, string>();

  for (const contents of readTmuxConfigs()) {
    for (const line of contents.split("\n")) {
      const match = line.match(BIND_PATTERN);
      if (!match) {
        continue;
      }

      const parsed = parseLine(match[1]);
      if (parsed) {
        bindings.set(commandSignature(parsed.command), parsed.key);
      }
    }
  }

  return bindings;
}
