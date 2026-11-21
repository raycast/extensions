import { homedir } from "node:os";
import { basename } from "node:path";
import { focusedBlock, hostDisplayName, shortId, type RexBlock, type RexSession, type RexWindow } from "./types";

/** The name Rex gives a new tab until the user renames it. */
const AUTO_LABEL = /^Window [0-9a-f]{8}$/;

export function sessionTitle(session: RexSession): string {
  return session.label || shortId(session.sessionId);
}

/** True while a tab has no name of its own, so its focused pane describes it better. */
export function hasAutoLabel(window: RexWindow): boolean {
  return window.label.length === 0 || AUTO_LABEL.test(window.label);
}

/** The tab's label, or its focused pane's title while the label is empty or generated. */
export function windowTitle(window: RexWindow): string {
  const focused = hasAutoLabel(window) ? focusedBlock(window) : undefined;
  return focused ? blockTitle(focused) : window.label || shortId(window.windowId);
}

export function blockTitle(block: RexBlock): string {
  const cwd = block.process?.cwd;
  return block.title ?? (cwd ? basename(cwd) || cwd : block.label || shortId(block.blockId));
}

/** Abbreviate the home directory to `~`, only where it ends at a path separator. */
export function shortPath(path: string, home = homedir()): string {
  const root = home.replace(/\/+$/, "");
  if (!root || !path.startsWith(root)) return path;
  const rest = path.slice(root.length);
  return rest === "" || rest.startsWith("/") ? `~${rest}` : path;
}

/** Rex's tab title pattern: `<program> <directory>`. */
export function processLabel(block: RexBlock): string | undefined {
  const name = block.process?.name;
  const cwd = block.process?.cwd;
  if (name && cwd) return `${name} ${shortPath(cwd)}`;
  return name ?? (cwd ? shortPath(cwd) : undefined);
}

/** "This Mac" is only worth a mention when there is more than one host. */
export function hostSuffix(session: RexSession, hostCount: number): string | undefined {
  if (session.host.thisMachine && hostCount <= 1) return undefined;
  return hostDisplayName(session.host);
}
