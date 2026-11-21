import { Color, Icon, type Image } from "@raycast/api";
import { glyphTitle } from "./glyphs";
import type { ProgramStatus, RexBlock, RexHost, RexWindow } from "./types";

export interface StatusLook {
  /** Rex's own phrasing: "Claude Code · working". */
  label: string;
  state: string;
  color: Color.ColorLike;
  /** A small circle in the state's colour; Rex's status art is reserved for the pill badge style. */
  icon: Image.ImageLike;
  tooltip?: string;
}

/** The hues of Rex's status art on tabs, the Dock badge, and Settings. */
export const STATE_COLORS = {
  working: "#3795ff",
  done: "#79c243",
  blocked: "#ffa001",
  error: "#ff7047",
} as const;

/** Rex's accent in its default Merino theme, for "active" and "focused" markers. */
export const ACCENT: Color.ColorLike = { light: "#0667d8", dark: "#3485fa", adjustContrast: true };

const APP_NAMES: Record<string, string> = {
  "claude-code": "Claude Code",
  claude: "Claude Code",
  amp: "Amp",
  codex: "Codex",
  cursor: "Cursor",
  gemini: "Gemini",
  copilot: "Copilot",
  droid: "Droid",
  pi: "Pi",
};

export function appDisplayName(app: string): string {
  if (Object.hasOwn(APP_NAMES, app)) return APP_NAMES[app];
  const fromCatalog = glyphTitle(app);
  if (fromCatalog) return fromCatalog;
  return app
    .split(/[-_]/)
    .filter(Boolean)
    .map((part) => part[0].toUpperCase() + part.slice(1))
    .join(" ");
}

/** Rex's own tooltips for a blocked program. */
function blockedReason(kind?: string): string {
  switch (kind) {
    case "question":
      return "Waiting for an answer";
    case "auth":
      return "Waiting for a password";
    default:
      return "Waiting for permission";
  }
}

/** How one status record should look, mirroring Rex's tab indicators. */
export function statusLook(status: ProgramStatus): StatusLook {
  const app = appDisplayName(status.app);
  const base = { label: `${app} · ${status.state}`, state: status.state, tooltip: status.msg ?? status.title };
  switch (status.state) {
    case "working":
      return {
        ...base,
        color: STATE_COLORS.working,
        icon: { source: Icon.CircleFilled, tintColor: STATE_COLORS.working },
      };
    case "done":
      return { ...base, color: STATE_COLORS.done, icon: { source: Icon.CircleFilled, tintColor: STATE_COLORS.done } };
    case "blocked":
      return {
        ...base,
        color: STATE_COLORS.blocked,
        icon: { source: Icon.CircleFilled, tintColor: STATE_COLORS.blocked },
        tooltip: status.msg ? `${blockedReason(status.kind)}: ${status.msg}` : blockedReason(status.kind),
      };
    case "error":
      return { ...base, color: STATE_COLORS.error, icon: { source: Icon.CircleFilled, tintColor: STATE_COLORS.error } };
    default:
      return { ...base, color: Color.SecondaryText, icon: { source: Icon.Circle, tintColor: Color.SecondaryText } };
  }
}

/** Order used when summarizing several statuses: the most urgent first. */
const STATE_PRIORITY: Record<string, number> = { blocked: 0, error: 1, done: 2, working: 3, idle: 4 };

function priority(state: string): number {
  return Object.hasOwn(STATE_PRIORITY, state) ? STATE_PRIORITY[state] : 5;
}

/** The root status of every block that reports one, most urgent first. */
export function blockStatuses(blocks: RexBlock[]): ProgramStatus[] {
  return blocks.flatMap((block) => block.status.slice(0, 1)).sort((a, b) => priority(a.state) - priority(b.state));
}

export function windowStatuses(window: RexWindow): ProgramStatus[] {
  return blockStatuses(window.blocks);
}

/** Counts per state, for a session-level summary such as "1 blocked · 2 working". */
export function summarizeStatuses(statuses: ProgramStatus[]): { state: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const status of statuses) counts.set(status.state, (counts.get(status.state) ?? 0) + 1);
  return [...counts.entries()]
    .map(([state, count]) => ({ state, count }))
    .sort((a, b) => priority(a.state) - priority(b.state));
}

export function stateColor(state: string): Color.ColorLike {
  return Object.hasOwn(STATE_COLORS, state) ? STATE_COLORS[state as keyof typeof STATE_COLORS] : Color.SecondaryText;
}

/** Raycast icon for a host, following the icon names `rex hosts add --icon` accepts. */
export function hostIcon(host: RexHost): Icon {
  if (host.thisMachine) return Icon.Monitor;
  switch (host.icon) {
    case "server.rack":
      return Icon.HardDrive;
    case "cloud":
      return Icon.Cloud;
    case "macbook":
    case "macmini":
    case "macstudio":
    case "desktopcomputer":
      return Icon.Desktop;
    default:
      return Icon.Globe;
  }
}

/** Progress of a working program among the blocks, when one reports it. */
export function workingProgress(blocks: RexBlock[]): number | undefined {
  for (const status of blockStatuses(blocks)) {
    if (status.state === "working" && typeof status.progress === "number") return status.progress;
  }
  return undefined;
}

/** True when a program among the blocks is working without reporting progress. */
export function hasIndeterminateWorking(blocks: RexBlock[]): boolean {
  return blockStatuses(blocks).some((status) => status.state === "working" && typeof status.progress !== "number");
}
