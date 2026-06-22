// Pure, Raycast-free logic so it can be unit-tested with plain `node --test`.

export interface Focus {
  name: string;
  emoji: string;
  tier: string;
}

export interface StatusRow {
  focus: string;
  project: string;
  path: string;
  branch: string | null;
  dirty: boolean;
}

export interface PosCommand {
  name: string;
  synopsis: string;
  args: string;
  example: string;
}

// Commands that only make sense at a real TTY — never offer them in the launcher.
export const EXCLUDED_COMMANDS = new Set(["i", "interactive"]);

// load/rm close or destroy live workspaces — they must confirm first.
export function isDestructive(name: string): boolean {
  return name === "load" || name === "rm";
}

export function needsArgs(cmd: PosCommand): boolean {
  return (cmd.args ?? "").trim().length > 0;
}

export function paletteCommands(items: PosCommand[]): PosCommand[] {
  return items.filter((c) => !EXCLUDED_COMMANDS.has(c.name));
}

export function filterPalette(
  items: PosCommand[],
  query: string,
): PosCommand[] {
  const q = (query ?? "").trim().toLowerCase();
  if (!q) return [...items];
  return items.filter(
    (c) =>
      c.name.toLowerCase().includes(q) ||
      (c.synopsis ?? "").toLowerCase().includes(q),
  );
}

// Split a raw argument string into tokens, honouring single/double quotes.
// Good enough for command args typed in a Raycast form (no shell expansion).
export function splitArgs(raw: string): string[] {
  const out: string[] = [];
  const re = /"([^"]*)"|'([^']*)'|(\S+)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(raw ?? "")) !== null) {
    out.push(m[1] ?? m[2] ?? m[3] ?? "");
  }
  return out;
}

export function groupByFocus(rows: StatusRow[]): Map<string, StatusRow[]> {
  const m = new Map<string, StatusRow[]>();
  for (const r of rows) {
    const bucket = m.get(r.focus);
    if (bucket) bucket.push(r);
    else m.set(r.focus, [r]);
  }
  return m;
}
