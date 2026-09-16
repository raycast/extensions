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
  /** Set only on `KEY=value` lines; absent on comments, blanks and anything unparseable. */
  key?: string;
  value?: string;
}

export function parseEnv(env: string): EnvLine[] {
  return env.split("\n").map((raw) => {
    const trimmed = raw.trim();
    if (trimmed === "" || trimmed.startsWith("#")) return { raw };

    // The first `=` wins: values routinely contain more of them (base64 padding, query strings,
    // connection URIs), and splitting on all of them would truncate the value at the second one.
    const separator = raw.indexOf("=");
    if (separator === -1) return { raw };

    return { raw, key: raw.slice(0, separator).trim(), value: raw.slice(separator + 1) };
  });
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
 */
export function maskValues(lines: EnvLine[]): string {
  return lines.map((line) => (line.key === undefined ? line.raw : `${line.key}=••••••••`)).join("\n");
}
