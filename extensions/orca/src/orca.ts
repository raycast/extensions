/** Shape of one row returned by `orca terminal list --json`. */
export type OrcaTerminal = {
  handle: string;
  worktreePath: string;
  worktreeId: string;
  branch?: string;
  title: string;
  connected: boolean;
  orphaned?: boolean;
  lastOutputAt: number | null;
  preview?: string;
  executionHostId?: string;
  tabId?: string;
  leafId?: string;
  /** Present only when Orca recognises the pane as an agent rather than a plain shell. */
  agentIdentity?: string;
};

/** One entry of `worktrees[].agents[]` from `orca worktree ps --json`. */
export type OrcaAgent = {
  paneKey: string;
  state: string;
  agentType?: string;
  /** Orca sends an explicit null when the agent is not sitting in a tool. */
  toolName?: string | null;
  stateStartedAt?: number;
  /** The last thing the user asked this agent, truncated by Orca. */
  prompt?: string | null;
  lastAssistantMessage?: string | null;
};

export type OrcaWorktree = {
  path: string;
  agents?: OrcaAgent[];
};

/** A terminal joined with whatever Orca knows about the agent driving it. */
export type AgentRow = OrcaTerminal & {
  state?: string;
  toolName?: string | null;
  stateStartedAt?: number;
  prompt?: string | null;
  lastAssistantMessage?: string | null;
};

/** Which agents the list shows. The dropdown in the list switches it. */
export type StatusFilter = "waiting" | "stopped" | "all";

/**
 * What the background command writes in the root search. Independent of the
 * list's own filter: this one is a preference, that one is a dropdown.
 */
export type SummaryMode = "sessions" | "counts";

/** Which kind of pane the list shows. */
export type AgentFilter = "all-agents" | "claude" | "codex" | "everything";

/** Orca keys panes as `tabId:leafId`; that is what `worktree ps` reports as paneKey. */
function paneKey(terminal: OrcaTerminal): string {
  return `${terminal.tabId ?? ""}:${terminal.leafId ?? ""}`;
}

export function mergeAgents(
  terminals: OrcaTerminal[],
  worktrees: OrcaWorktree[],
): AgentRow[] {
  const agents = new Map<string, OrcaAgent>();
  for (const worktree of worktrees) {
    for (const agent of worktree.agents ?? []) {
      agents.set(agent.paneKey, agent);
    }
  }

  return terminals.map((terminal) => {
    const agent = agents.get(paneKey(terminal));
    if (!agent) return { ...terminal };
    return {
      ...terminal,
      state: agent.state,
      toolName: agent.toolName,
      stateStartedAt: agent.stateStartedAt,
      prompt: agent.prompt,
      lastAssistantMessage: agent.lastAssistantMessage,
    };
  });
}

export function filterRows(
  rows: AgentRow[],
  status: StatusFilter,
  agent: AgentFilter,
): AgentRow[] {
  return rows.filter((row) => {
    if (agent === "claude" || agent === "codex") {
      if (row.agentIdentity !== agent) return false;
    } else if (agent === "all-agents" && !row.agentIdentity) {
      return false;
    }

    if (status === "waiting") return row.state === "waiting";
    if (status === "stopped")
      return row.state === "waiting" || row.state === "done";
    return true;
  });
}

export type Section =
  | { kind: "waiting"; key: string; items: AgentRow[] }
  | { kind: "project"; key: string; items: AgentRow[] };

/** The last path segment — what Orca shows as the project. */
function folderName(path: string): string {
  return path.split("/").filter(Boolean).pop() ?? path;
}

/** Enough of the path to tell two projects of the same name apart. */
function qualifiedName(path: string): string {
  return path.split("/").filter(Boolean).slice(-2).join("/");
}

/** Orca groups panes by worktree; the last path segment is what the app shows as the project. */
export function projectName(row: { worktreePath: string }): string {
  return folderName(row.worktreePath);
}

export function buildSections(rows: AgentRow[]): Section[] {
  const waiting = rows.filter((row) => row.state === "waiting");
  const rest = rows.filter((row) => row.state !== "waiting");

  const sections: Section[] = [];
  if (waiting.length > 0) {
    sections.push({
      kind: "waiting",
      key: "waiting",
      // The one that has been blocked longest is the one most likely forgotten.
      items: [...waiting].sort(
        (a, b) => (a.stateStartedAt ?? 0) - (b.stateStartedAt ?? 0),
      ),
    });
  }

  // Keyed by path, not by name: /team-a/app and /team-b/app are two projects
  // that happen to share a folder name.
  const byPath = new Map<string, AgentRow[]>();
  for (const row of rest) {
    byPath.set(row.worktreePath, [
      ...(byPath.get(row.worktreePath) ?? []),
      row,
    ]);
  }

  const names = [...byPath.keys()].map(folderName);
  const ambiguous = new Set(
    names.filter((name, index) => names.indexOf(name) !== index),
  );

  const recency = (row: AgentRow) => row.lastOutputAt ?? 0;
  const projects: Section[] = [...byPath.entries()]
    .map(([path, items]) => ({
      kind: "project" as const,
      // Only the colliding ones pay for the longer label.
      key: ambiguous.has(folderName(path))
        ? qualifiedName(path)
        : folderName(path),
      items: [...items].sort((a, b) => recency(b) - recency(a)),
    }))
    .sort((a, b) => recency(b.items[0]) - recency(a.items[0]));

  return [...sections, ...projects];
}

/** Orca prefixes pane titles with a status glyph; it is noise outside the app. */
export function cleanTitle(title: string): string {
  return title
    .replace(/^[^\p{L}\p{N}]+/u, "")
    .replace(/^(claude|codex|cursor|opencode)\s*:\s*/i, "")
    .trim();
}

/**
 * Orca names a pane from its first prompt, but gives up on things like a bare
 * slash command and leaves the agent's own name behind. Those titles say
 * nothing, so the prompt is a better label.
 */
function isGeneratedTitle(title: string, agent?: string): boolean {
  const clean = cleanTitle(title).toLowerCase();
  if (clean.length === 0) return true;
  if (!agent) return false;
  return clean === agent || clean === `${agent} code`;
}

/** URLs eat the whole line; their tail is what identifies the task. */
function shortenUrls(text: string): string {
  return text.replace(/https?:\/\/\S+/g, (url) => {
    const parts = url.split("?")[0].split("/").filter(Boolean);
    return parts.slice(-2).join("/");
  });
}

/** What to show as the row's title: Orca's own label, or the prompt behind it. */
export function sessionTitle(
  row: {
    title: string;
    agentIdentity?: string;
    prompt?: string | null;
  },
  maxLength = 60,
): string {
  const label = pickLabel(row);

  // The ellipsis counts towards the limit, so a caller's budget holds exactly.
  return label.length > maxLength
    ? `${label.slice(0, maxLength - 1).trimEnd()}…`
    : label;
}

function pickLabel(row: {
  title: string;
  agentIdentity?: string;
  prompt?: string | null;
}): string {
  if (!isGeneratedTitle(row.title, row.agentIdentity))
    return cleanTitle(row.title);

  const prompt = row.prompt?.split("\n").find((line) => line.trim().length > 0);
  if (!prompt) return cleanTitle(row.title) || (row.agentIdentity ?? "");

  return shortenUrls(prompt).replace(/\s+/g, " ").trim();
}

/**
 * How a row reads in the list. Rows grouped under a project heading do not
 * repeat it; rows in the waiting section come from everywhere, so they lead
 * with the project — the same shape the root search subtitle uses.
 */
export function sessionLabel(
  row: Parameters<typeof sessionTitle>[0] & { worktreePath: string },
  withProject: boolean,
): string {
  const title = sessionTitle(row);
  return withProject ? `${projectName(row)}: ${title}` : title;
}

/** Blocked longest first — the same order the list uses. */
function waitingFirst(rows: AgentRow[]): AgentRow[] {
  return rows
    .filter((row) => row.state === "waiting")
    .sort((a, b) => (a.stateStartedAt ?? 0) - (b.stateStartedAt ?? 0));
}

/** "❓ a · ❓ b" when the whole list fits, otherwise nothing. */
function joinWithin(labels: string[], maxLength: number): string | null {
  const line = labels.map((label) => `❓ ${label}`).join(" · ");
  return line.length <= maxLength ? line : null;
}

/** As much of the list as fits, with the remainder counted: "❓ checkout +2". */
function joinTruncated(labels: string[], maxLength: number): string | null {
  for (let kept = labels.length - 1; kept > 0; kept--) {
    const line = `${labels
      .slice(0, kept)
      .map((label) => `❓ ${label}`)
      .join(" · ")} +${labels.length - kept}`;
    if (line.length <= maxLength) return line;
  }
  return null;
}

/**
 * Subtitle for the root search entry. Returns null when there is nothing to
 * report, so the command falls back to its manifest subtitle instead of
 * showing a stale count.
 *
 * In "sessions" mode it lists the blocked sessions by name; when they outgrow
 * the row it degrades to project names, and then to a count, so the line always
 * says at least where to look.
 */
export function summarize(
  rows: AgentRow[],
  mode: SummaryMode,
  maxLength = 55,
): string | null {
  const waiting = waitingFirst(rows);

  if (mode === "sessions") {
    if (waiting.length === 0) return null;

    // The project stays whatever happens: it is what tells two panes apart.
    const entries = waiting.map((row) => ({ row, project: projectName(row) }));
    const label = (project: string, title: string) => `${project}: ${title}`;

    const full = joinWithin(
      entries.map((entry) => label(entry.project, sessionTitle(entry.row))),
      maxLength,
    );
    if (full) return full;

    // "❓ " and ": " per entry, " · " between them — the rest is for the names.
    const overhead =
      entries.reduce((sum, entry) => sum + 4 + entry.project.length, 0) +
      (entries.length - 1) * 3;
    const budget = Math.floor((maxLength - overhead) / entries.length);
    if (budget > 6) {
      const trimmed = joinWithin(
        entries.map((entry) =>
          label(entry.project, sessionTitle(entry.row, budget)),
        ),
        maxLength,
      );
      if (trimmed) return trimmed;
    }

    const names = [...new Set(waiting.map(projectName))];
    return (
      joinWithin(names, maxLength) ??
      joinTruncated(names, maxLength) ??
      `❓ ${waiting.length} waiting`
    );
  }

  const working = rows.filter((row) => row.state === "working").length;
  const parts: string[] = [];
  if (waiting.length > 0) parts.push(`${waiting.length} waiting`);
  if (working > 0) parts.push(`${working} working`);
  return parts.length > 0 ? parts.join(" · ") : null;
}

type OrcaEnvelope<T> = {
  ok: boolean;
  result?: T;
  error?: { code?: string; message?: string };
};

/** Every Orca command answers with the same envelope; unwrap it or throw what it reported. */
export function unwrap<T>(stdout: string): T | undefined {
  const envelope = JSON.parse(stdout) as OrcaEnvelope<T>;
  if (!envelope.ok) {
    throw new Error(
      envelope.error?.message ?? "Orca returned an unsuccessful response",
    );
  }
  return envelope.result;
}

/** Runs one Orca CLI command and unwraps its envelope. */
async function run<T>(
  orcaPath: string,
  args: string[],
  exec: (path: string, args: string[]) => Promise<{ stdout: string }>,
): Promise<T | undefined> {
  const { stdout } = await exec(orcaPath, args);
  return unwrap<T>(stdout);
}

/**
 * Asks Orca for its live terminals and for what each agent is doing, then joins them.
 * `terminal list` alone never reports agent state, so both calls are required.
 */
export async function loadAgents(
  orcaPath: string,
  exec: (path: string, args: string[]) => Promise<{ stdout: string }>,
): Promise<AgentRow[]> {
  const [terminals, worktrees] = await Promise.all([
    run<{ terminals: OrcaTerminal[] }>(
      orcaPath,
      ["terminal", "list", "--limit", "100", "--json"],
      exec,
    ),
    run<{ worktrees: OrcaWorktree[] }>(
      orcaPath,
      ["worktree", "ps", "--json"],
      exec,
    ),
  ]);

  return mergeAgents(terminals?.terminals ?? [], worktrees?.worktrees ?? []);
}
