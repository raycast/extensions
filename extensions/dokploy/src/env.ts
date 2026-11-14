/**
 * Dokploy stores environment variables as a single newline-separated string rather than as rows, so
 * showing them means parsing that string here.
 *
 * Comments and blank lines are carried through rather than filtered out: they round-trip through
 * the save route, and an editor that dropped them would quietly delete whatever the user wrote to
 * remind themselves what a variable was for.
 */
export interface EnvLine {
  raw: string;
  /** Set only on the first line of a `KEY=value` assignment; absent on comments, blanks and continuation lines. */
  key?: string;
  value?: string;
  /**
   * True for a line that continues the still-open quoted value of the assignment above it.
   *
   * A masking pass can't safely re-derive this from `raw` alone - a continuation line can look like
   * a comment, a blank line, or a fresh `KEY=value` assignment, and only the parser walking the
   * string top to bottom actually knows which one it really is.
   */
  continuation?: boolean;
}

type Quote = '"' | "'" | "`";

/**
 * True if `text` contains `quote` at a position that isn't escaped - matching `dotenv`'s own quoted
 * value syntax (`\"` inside a double-quoted value doesn't close it). Backslash-counting rather than
 * a plain `includes`: an escaped quote right before a real one (`\"...\""`) is common enough in
 * JSON-shaped values that treating it as a close would cut the value short and leave the rest
 * flowing into "new assignment" lines - which is exactly the class of bug this file has already
 * gotten wrong twice.
 */
function hasUnescapedQuote(text: string, quote: Quote): boolean {
  for (let i = 0; i < text.length; i++) {
    if (text[i] !== quote) continue;
    let backslashes = 0;
    for (let j = i - 1; j >= 0 && text[j] === "\\"; j--) backslashes++;
    if (backslashes % 2 === 0) return true;
  }
  return false;
}

/**
 * `dotenv` (which Dokploy parses `env` with) lets a value span multiple lines when it opens a quote
 * it doesn't close on the same line - a PEM key is the common case. Single, double and backtick
 * quotes all support this. Returns the quote character the value opened with if so, so the caller
 * can treat following lines as its continuation rather than new assignments.
 */
function unclosedQuote(value: string): Quote | undefined {
  const trimmed = value.trimStart();
  const quote = trimmed[0];
  if (quote !== '"' && quote !== "'" && quote !== "`") return undefined;
  return hasUnescapedQuote(trimmed.slice(1), quote) ? undefined : quote;
}

export function parseEnv(env: string): EnvLine[] {
  const lines: EnvLine[] = [];
  let openQuote: Quote | undefined;

  for (const raw of env.split("\n")) {
    if (openQuote) {
      lines.push({ raw, continuation: true });
      if (hasUnescapedQuote(raw, openQuote)) openQuote = undefined;
      continue;
    }

    const trimmed = raw.trim();
    if (trimmed === "" || trimmed.startsWith("#")) {
      lines.push({ raw });
      continue;
    }

    // The first `=` wins: values routinely contain more of them (base64 padding, query strings,
    // connection URIs), and splitting on all of them would truncate the value at the second one.
    const separator = raw.indexOf("=");
    if (separator === -1) {
      lines.push({ raw });
      continue;
    }

    const value = raw.slice(separator + 1);
    lines.push({ raw, key: raw.slice(0, separator).trim(), value });
    openQuote = unclosedQuote(value);
  }

  return lines;
}

export function countVariables(lines: EnvLine[]): number {
  return lines.filter((line) => line.key !== undefined).length;
}

/**
 * Renders the variables with their values replaced.
 *
 * Every value is masked, not just the ones that look like a secret: `API_KEY` is easy to spot, but
 * so is a database URL hiding in `DSN` or a token in `SENTRY_DSN`, and a rule that guesses wrong
 * leaks the one value it failed to recognise. The mask is a fixed width so it doesn't give away the
 * length of what it's hiding either.
 *
 * A continuation line is masked unconditionally, and first - before anything that looks at its
 * text - because it can look exactly like a blank line, a `#` comment or a fresh assignment while
 * actually being part of the value above it. Only a genuinely top-level blank line or `#` comment
 * is shown as-is, and even a top-level comment is masked if it looks like a commented-out assignment
 * (contains its own `=`): a value stashed in a disabled line is still a value.
 */
export function maskValues(lines: EnvLine[]): string {
  return lines
    .map((line) => {
      if (line.continuation) return "••••••••";

      const trimmed = line.raw.trim();
      if (trimmed === "") return line.raw;
      if (trimmed.startsWith("#")) return trimmed.includes("=") ? "••••••••" : line.raw;

      return line.key !== undefined ? `${line.key}=••••••••` : "••••••••";
    })
    .join("\n");
}
