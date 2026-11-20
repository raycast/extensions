import type { Pane } from "./model";

// Assets and selection order mirror Kero icons.go at 09eb1d42.
// See THIRD_PARTY_NOTICES.md for sources and licenses.
export const KERO_ICONS = {
  terminal: "kero/meteor-terminal.svg",
  globe: "kero/f7-globe.svg",
  branch: "kero/f7-arrow-branch.svg",
  refresh: "kero/f7-arrow-clockwise.svg",
  open: "kero/f7-arrow-up-right-square.svg",
  copy: "kero/f7-doc-on-doc.svg",
} as const;

export const PROGRAM_ICONS = new Map<string, string>(
  [
    ["claude", "si-claude"],
    ["codex", "si-openai"],
    ["gemini", "si-googlegemini"],
    ["opencode", "si-opencode"],
    ["amp", "si-amp"],
    ["cursor-agent", "si-cursor"],
    ["copilot", "si-githubcopilot"],
    ["qwen", "si-qwen"],
    ["kimi", "si-kimi"],
    ["cline", "si-cline"],
    ["node", "si-nodedotjs"],
    ["bun", "si-bun"],
    ["deno", "si-deno"],
    ["python", "si-python"],
    ["python3", "si-python"],
    ["vim", "si-vim"],
    ["nvim", "si-neovim"],
    ["git", "si-git"],
    ["docker", "si-docker"],
  ].map(([program, icon]) => [program, `kero/${icon}.svg`]),
);

export interface PaneIcon {
  source: string;
  tint: "primary" | "secondary" | "#d97757" | "#3186ff";
}

export function getPaneIcon(pane: Pick<Pane, "agent" | "process" | "runtime" | "url" | "status">): PaneIcon {
  let source: string = KERO_ICONS.terminal;
  if (pane.url) {
    source = KERO_ICONS.globe;
  } else {
    // Unknown agents (including pi) can use their process/runtime logo, as in Kero.
    for (const program of [pane.agent, pane.process, pane.runtime]) {
      const icon = program ? PROGRAM_ICONS.get(program) : undefined;
      if (icon) {
        source = icon;
        break;
      }
    }
  }

  // Keep program identity separate from task status (shown in the status tag).
  // Raycast's dynamic text colors replace Kero's theme-specific muted/faint colors.
  let tint: PaneIcon["tint"] = "secondary";
  if (pane.status !== "exited" && pane.agent) {
    tint = pane.agent === "claude" ? "#d97757" : pane.agent === "gemini" ? "#3186ff" : "primary";
  }
  return { source, tint };
}
