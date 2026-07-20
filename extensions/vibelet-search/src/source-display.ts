import type { SessionSource } from "./types";

export const SOURCE_LABEL: Record<SessionSource, string> = {
  "claude-cli": "Claude Code",
  "claude-app": "Claude App",
  "codex-cli": "Codex CLI",
  "codex-app": "Codex App",
};

export const SOURCE_BADGE: Record<SessionSource, string> = {
  "claude-cli": "🟠",
  "claude-app": "🟣",
  "codex-cli": "🟢",
  "codex-app": "🔵",
};
