// Pure parsing of `ift workspaces` output, kept import-free so node --test can run it.

export type Workspace = {
  id: string;
  name: string;
  cards: number;
  active: boolean;
};

// Piped output is tab separated with no header: id, name, cards, active ("*" or "-").
export function parseWorkspaces(output: string): Workspace[] {
  const rows: Workspace[] = [];
  for (const line of output.split("\n")) {
    if (!line.trim()) continue;
    const [id, name, cards, active] = line.split("\t");
    if (!id || name === undefined) continue;
    rows.push({ id, name, cards: Number.parseInt(cards ?? "0", 10) || 0, active: active?.trim() === "*" });
  }
  return rows;
}

export type Card = {
  id: string;
  cwd: string;
  state: string;
  remote?: string;
  number: number;
};

// `ift ls` into a pipe: id, group, cwd, state, remote, number, tab separated, no header.
// "-" in the remote column means a local card.
export function parseCards(output: string): Card[] {
  const rows: Card[] = [];
  for (const line of output.split("\n")) {
    if (!line.trim()) continue;
    const [id, , cwd, state, remote, number] = line.split("\t");
    if (!id || cwd === undefined) continue;
    rows.push({
      id,
      cwd,
      state: state?.trim() || "none",
      remote: remote && remote.trim() !== "-" ? remote.trim() : undefined,
      number: Number.parseInt(number ?? "0", 10) || 0,
    });
  }
  return rows;
}

// `~` and `~/x` to an absolute path; `ift ls` prints card directories with the home abbreviated.
export function expandHome(path: string, home: string): string {
  const p = path.trim();
  if (p === "~") return home;
  return p.startsWith("~/") ? home + p.slice(1) : p;
}

// Distinct card directories, most used first (a directory with several cards ranks higher).
export function cardDirs(cards: Card[], home: string): string[] {
  const counts = new Map<string, number>();
  for (const c of cards) {
    if (c.remote) continue;
    const dir = expandHome(c.cwd, home);
    counts.set(dir, (counts.get(dir) ?? 0) + 1);
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([dir]) => dir);
}

// The last-used workspace first, the rest in their tab order. A stale id changes nothing.
export function prioritize(workspaces: Workspace[], lastId?: string): Workspace[] {
  const last = workspaces.find((w) => w.id === lastId);
  return last ? [last, ...workspaces.filter((w) => w !== last)] : workspaces;
}

// Argument vector for `ift terminal`. `--` ends the flags; pass undefined for an ift that predates them.
// `workspace` is a workspace id or the word "new"; `name` only applies to "new".
export function terminalArgs(dirs: string[], workspace?: string, name?: string, endFlags = true): string[] {
  const args = ["terminal"];
  if (workspace) args.push("--workspace", workspace);
  if (workspace === "new" && name?.trim()) args.push("--name", name.trim());
  if (endFlags) args.push("--");
  args.push(...dirs);
  return args;
}
