// Agent CLIs running in a terminal, recognized by process name: Codex, Gemini CLI, OpenCode... They're listed so
// they can be jumped to, with status "unknown" unless a dedicated source reads more (Claude Code has its own,
// claude.ts, and Codex threads from its daemon, codex.ts). Only the outermost process of each agent counts (agents spawn helpers with the same name).

import type { Agent, AgentContext, AgentSource } from "../model";
import type { Process } from "../../platform/model";

/** Process name → product. Names must be specific enough not to catch other programs. */
export const AGENT_CLIS: Record<string, string> = {
  // Claude Code sessions are described by claude.ts once they register; before that (e.g. waiting on the
  // "trust this folder?" prompt) they're only a process.
  claude: "Claude Code",
  codex: "Codex",
  "cursor-agent": "Cursor Agent",
  gemini: "Gemini CLI",
  opencode: "OpenCode",
  amp: "Amp",
  aider: "Aider",
  goose: "Goose",
  droid: "Droid",
  copilot: "Copilot CLI",
  qwen: "Qwen Code",
  crush: "Crush",
};

export function toAgents(processes: Process[]): Agent[] {
  const byPid = new Map(processes.map((p) => [p.pid, p]));
  return processes.flatMap((p): Agent[] => {
    const product = AGENT_CLIS[p.name];
    if (!product || !p.tty || byPid.get(p.ppid)?.name === p.name) return [];
    return [
      {
        key: `cli:${p.pid}:${p.startedAt}`,
        source: cli.id,
        product,
        id: String(p.pid),
        title: product,
        cwd: p.cwd || undefined,
        status: "unknown",
        since: p.startedAt,
        host: { kind: "process", pid: p.pid, tty: p.tty },
      },
    ];
  });
}

export const cli: AgentSource = {
  id: "cli",
  list: async ({ processes }: AgentContext) => toAgents(processes),
};
