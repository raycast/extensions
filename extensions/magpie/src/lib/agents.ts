/** Display name → CLI id for magpie 0.1.58. Names magpie adds later stay visible but cannot be switched. */
export const AGENTS: { name: string; id: string }[] = [
  { name: "Claude Code", id: "claude" },
  { name: "Codex", id: "codex" },
  { name: "Gemini CLI", id: "gemini" },
  { name: "OpenCode", id: "opencode" },
  { name: "Pi", id: "pi" },
  { name: "Goose", id: "goose" },
  { name: "Cursor", id: "cursor" },
  { name: "Copilot CLI", id: "copilot" },
  { name: "Crush", id: "crush" },
  { name: "DeepSeek Harness", id: "dsh" },
  { name: "Command Code", id: "commandcode" },
  { name: "omp", id: "omp" },
  { name: "Devin", id: "devin" },
  { name: "Hermes Agent", id: "hermes" },
];

const BY_NAME = new Map(AGENTS.map((agent) => [agent.name, agent.id]));

export function agentId(name: string): string | undefined {
  return BY_NAME.get(name);
}
