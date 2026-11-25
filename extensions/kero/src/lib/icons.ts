import type { Icon } from "@raycast/api";
import type { Pane } from "./model";

// Bundled artwork comes from Kero; most programs use Raycast category icons.
// See THIRD_PARTY_NOTICES.md for sources and licenses.
export const KERO_ICONS = {
  terminal: "kero/meteor-terminal.svg",
  globe: "kero/f7-globe.svg",
  branch: "kero/f7-arrow-branch.svg",
  refresh: "kero/f7-arrow-clockwise.svg",
  settings: "kero/f7-gear-alt.svg",
  open: "kero/f7-arrow-up-right-square.svg",
  copy: "kero/f7-doc-on-doc.svg",
} as const;

type BuiltinPaneIcon = keyof Pick<typeof Icon, "Stars" | "CodeBlock" | "Pencil" | "Box" | "Terminal">;

// Keep the model usable outside Raycast's host; resolve SDK icons in the view.
export type PaneIconSource = { builtin: BuiltinPaneIcon } | { asset: string };

export const PROGRAM_ICONS = new Map<string, PaneIconSource>([
  ["claude", { builtin: "Stars" }],
  ["codex", { builtin: "Stars" }],
  ["gemini", { builtin: "Stars" }],
  ["opencode", { builtin: "Stars" }],
  ["amp", { builtin: "Stars" }],
  ["cursor-agent", { builtin: "Stars" }],
  ["copilot", { asset: "kero/si-githubcopilot.svg" }],
  ["qwen", { builtin: "Stars" }],
  ["kimi", { builtin: "Stars" }],
  ["cline", { builtin: "Stars" }],
  ["node", { builtin: "CodeBlock" }],
  ["bun", { builtin: "CodeBlock" }],
  ["deno", { asset: "kero/si-deno.svg" }],
  ["python", { builtin: "CodeBlock" }],
  ["python3", { builtin: "CodeBlock" }],
  ["vim", { builtin: "Pencil" }],
  ["nvim", { builtin: "Pencil" }],
  ["git", { asset: "kero/si-git.svg" }],
  ["docker", { builtin: "Box" }],
]);

export interface PaneIcon {
  source: PaneIconSource;
  tint: "primary" | "secondary" | "#d97757" | "#3186ff";
}

export function getPaneIcon(pane: Pick<Pane, "agent" | "process" | "runtime" | "url" | "status">): PaneIcon {
  let source: PaneIconSource = { builtin: "Terminal" };
  if (pane.url) {
    source = { asset: KERO_ICONS.globe };
  } else {
    // Unknown agents (including pi) can use their process/runtime icon, as in Kero.
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
