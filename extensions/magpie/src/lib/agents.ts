/**
 * Display name → CLI id, matched to `magpie agents` and the agent-specific model listings.
 * Names magpie adds later stay visible but cannot be switched until they are listed here.
 */
export const AGENTS: { name: string; id: string }[] = [
  { name: "Claude Code", id: "claude" },
  { name: "Codex", id: "codex" },
  { name: "Gemini CLI", id: "gemini" },
  { name: "OpenCode", id: "opencode" },
  { name: "Pi", id: "pi" },
  { name: "Goose", id: "goose" },
  { name: "Cursor", id: "cursor" },
  { name: "Zed", id: "zed" },
  { name: "VS Code", id: "vscode" },
  { name: "Droid", id: "droid" },
  { name: "Copilot CLI", id: "copilot" },
  { name: "Crush", id: "crush" },
  { name: "DeepSeek Harness", id: "dsh" },
  { name: "Command Code", id: "commandcode" },
  { name: "omp", id: "omp" },
  { name: "Devin", id: "devin" },
  { name: "Hermes Agent", id: "hermes" },
  { name: "MiMo Code", id: "mimocode" },
  { name: "Cline", id: "cline" },
  { name: "Qoder", id: "qoder" },
  { name: "Qoder CN", id: "qoder-cn" },
  { name: "Grok Build", id: "grok" },
  { name: "ZCode", id: "zcode" },
  { name: "Alma", id: "alma" },
  { name: "Antigravity CLI", id: "agy" },
  { name: "Claude Desktop", id: "claude-desktop" },
  { name: "fx", id: "fx" },
  { name: "Kimi Code", id: "kimi" },
  { name: "WorkBuddy", id: "workbuddy" },
  { name: "OpenHanako", id: "hanako" },
  { name: "Cindy", id: "cindy" },
];

const BY_NAME = new Map(AGENTS.map((agent) => [agent.name, agent.id]));

export function agentId(name: string): string | undefined {
  return BY_NAME.get(name);
}
