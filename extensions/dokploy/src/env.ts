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
}

type Quote = '"' | "'";

/**
 * `dotenv` (which Dokploy parses `env` with) lets a value span multiple lines when it opens a quote
 * it doesn't close on the same line - a PEM key is the common case. Returns the quote character the
 * value opened with if so, so the caller can treat following lines as its continuation rather than
 * new assignments.
 */
function unclosedQuote(value: string): Quote | undefined {
  const trimmed = value.trimStart();
  const quote = trimmed[0];
  if (quote !== '"' && quote !== "'") return undefined;
  return trimmed.indexOf(quote, 1) === -1 ? quote : undefined;
}

export function parseEnv(env: string): EnvLine[] {
  const lines: EnvLine[] = [];
  let openQuote: Quote | undefined;

  for (const raw of env.split("\n")) {
    if (openQuote) {
      lines.push({ raw });
      // A raw `includes` rather than tracking escapes: this only has to be conservative enough to
      // know when the multi-line value is *still open*, not to parse it correctly.
      if (raw.includes(openQuote)) openQuote = undefined;
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
 * Only a blank line or a `#` comment is shown as-is - never a bare `line.raw` fallback, and never
 * just the text after a line's own `=`. A continuation line of a multi-line value has no `=` of its
 * own and would otherwise pass straight through unmasked, and one that happens to contain a stray
 * `=` (a base64 line, say) would otherwise be split into a "key" that is actually secret content.
 */
export function maskValues(lines: EnvLine[]): string {
  return lines
    .map((line) => {
      const trimmed = line.raw.trim();
      if (trimmed === "" || trimmed.startsWith("#")) return line.raw;
      return line.key !== undefined ? `${line.key}=••••••••` : "••••••••";
    })
    .join("\n");
}
