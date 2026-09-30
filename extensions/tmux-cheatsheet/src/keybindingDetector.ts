// Flags that consume the next token as an argument
const ARG_FLAGS = new Set(["-c", "-t", "-s", "-n", "-N", "-p", "-F", "-f"]);

/**
 * Normalizes a tmux command to a signature for matching.
 * Strips working-dir flags, numeric args, placeholders, quoted strings,
 * and stops at command chains (\;) or brace blocks.
 *
 * Examples:
 *   "split-window -v -c '#{pane_current_path}'" -> "split-window -v"
 *   "resize-pane -L 3" -> "resize-pane -L"
 *   "source-file ~/.tmux.conf \; display 'done'" -> "source-file ~/.tmux.conf"
 */
export function commandSignature(fullCmd: string): string {
  const tokens = fullCmd.split(/\s+/);
  const parts: string[] = [];

  let i = 0;
  while (i < tokens.length) {
    const token = tokens[i];

    // Stop at command chains or brace blocks
    if (token === "\\;" || token === ";" || token === "{") break;

    // Skip flags that take an argument (and skip the argument too)
    if (ARG_FLAGS.has(token)) {
      i += 2;
      continue;
    }

    // Skip -k (kill) and -r (repeat): behavioral flags not part of identity
    if (token === "-k" || token === "-r") {
      i++;
      continue;
    }

    // Skip quoted strings and tmux format expansions
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

// tmux list-keys escapes shell-special chars in the key column (e.g. \" \# \$).
// Unescape for display and for matching against human-readable shortcuts.
function unescapeKey(key: string): string {
  return key.replace(/\\(.)/g, "$1");
}

function parseBinding(line: string): { key: string; command: string } | undefined {
  // Format: "bind-key [flags] -T <table> <key> <command...>"
  const match = line.match(/^\s*bind(?:-key)?\s+(.+)/);
  if (!match) return undefined;

  const tokens = match[1].split(/\s+/);
  let i = 0;

  while (i < tokens.length) {
    const token = tokens[i];
    if (token === "-r") {
      i++;
    } else if (token === "-T") {
      i += 2; // skip flag and table name
    } else if (token === "-N") {
      i++;
      if (i < tokens.length && tokens[i].startsWith('"')) {
        while (i < tokens.length && !tokens[i].endsWith('"')) {
          i++;
        }
        i++; // past closing-quote token
      } else {
        i++; // single-word note
      }
    } else {
      break;
    }
  }

  if (i >= tokens.length) return undefined;

  const key = unescapeKey(tokens[i]);
  i++;
  if (i >= tokens.length) return undefined;

  return { key, command: tokens.slice(i).join(" ") };
}

/**
 * Parses raw `tmux list-keys -T prefix` output into a map of normalized
 * command signatures (e.g. "split-window -v") to bound keys (e.g. "|").
 */
export function parseKeyBindings(output: string | undefined): ReadonlyMap<string, string> {
  const bindings = new Map<string, string>();
  if (!output) return bindings;

  for (const line of output.split("\n")) {
    const parsed = parseBinding(line);
    if (parsed) {
      bindings.set(commandSignature(parsed.command), parsed.key);
    }
  }

  return bindings;
}
