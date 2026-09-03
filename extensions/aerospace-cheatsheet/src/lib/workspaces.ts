import { aerospace } from "./config";

/**
 * Thin wrappers over the AeroSpace CLI's `--json` output.
 *
 * Field names are hyphenated in AeroSpace's JSON (`window-id`, `app-name`), so they
 * are mapped to camelCase here rather than being carried through the UI.
 */

export interface Workspace {
  name: string;
  isEmpty: boolean;
  isFocused: boolean;
}

export interface WindowInfo {
  windowId: number;
  appName: string;
  windowTitle: string;
  workspace?: string;
}

export async function listWorkspaces(): Promise<Workspace[]> {
  const [allRaw, nonEmptyRaw, focused] = await Promise.all([
    aerospace("list-workspaces", "--all", "--json"),
    aerospace("list-workspaces", "--monitor", "focused", "--empty", "no", "--json").catch(() => "[]"),
    aerospace("list-workspaces", "--focused").catch(() => ""),
  ]);

  const all = JSON.parse(allRaw) as { workspace: string }[];
  const nonEmpty = new Set((JSON.parse(nonEmptyRaw) as { workspace: string }[]).map((w) => w.workspace));

  return all.map(({ workspace }) => ({
    name: workspace,
    isEmpty: !nonEmpty.has(workspace),
    isFocused: workspace === focused.trim(),
  }));
}

/**
 * Fields to request explicitly.
 *
 * `list-windows --all --json` returns only app-name, window-id and window-title. It
 * does NOT include the workspace unless asked for, so every caller that grouped or
 * filtered by workspace was silently reading undefined. Naming the fields also pins
 * the shape against future changes to the CLI's defaults.
 */
const WINDOW_FORMAT = "%{window-id}%{app-name}%{window-title}%{workspace}";

export async function listWindows(workspace?: string): Promise<WindowInfo[]> {
  const args = workspace ? ["list-windows", "--workspace", workspace] : ["list-windows", "--all"];
  const raw = await aerospace(...args, "--format", WINDOW_FORMAT, "--json");
  const parsed = JSON.parse(raw) as {
    "window-id": number;
    "app-name": string;
    "window-title": string;
    workspace?: string;
  }[];
  return parsed.map((w) => ({
    windowId: w["window-id"],
    appName: w["app-name"],
    windowTitle: w["window-title"],
    workspace: w.workspace,
  }));
}

export async function focusWorkspace(name: string): Promise<void> {
  await aerospace("workspace", name);
}

export async function focusWindow(windowId: number): Promise<void> {
  await aerospace("focus", "--window-id", String(windowId));
}

export interface Monitor {
  id: number;
  name: string;
}

export async function listMonitors(): Promise<Monitor[]> {
  const raw = await aerospace("list-monitors", "--json");
  const parsed = JSON.parse(raw) as { "monitor-id": number; "monitor-name": string }[];
  return parsed.map((m) => ({ id: m["monitor-id"], name: m["monitor-name"] }));
}

export async function focusedMonitor(): Promise<Monitor | undefined> {
  const raw = await aerospace("list-monitors", "--focused", "--json");
  const parsed = JSON.parse(raw) as { "monitor-id": number; "monitor-name": string }[];
  const first = parsed[0];
  return first ? { id: first["monitor-id"], name: first["monitor-name"] } : undefined;
}

/**
 * Which monitor each workspace sits on, keyed by workspace name.
 *
 * A plain object, NOT a Map. This value is returned through `useCachedPromise`, which
 * persists its result as JSON, and a Map does not survive that round trip: it comes
 * back as `{}` with no `.get`. The result was a command that worked on its first run
 * against live data and threw "placement.get is not a function" on every cached run
 * afterwards.
 */
export type WorkspacePlacement = Record<string, number>;

/** Pure half, so the JSON-safety of the shape can be tested without the CLI. */
export function toPlacement(pairs: [string, number][]): WorkspacePlacement {
  return Object.fromEntries(pairs);
}

export async function workspaceMonitors(): Promise<WorkspacePlacement> {
  const monitors = await listMonitors();
  const pairs = await Promise.all(
    monitors.map(async (m) => {
      const raw = await aerospace("list-workspaces", "--monitor", String(m.id), "--json").catch(() => "[]");
      return (JSON.parse(raw) as { workspace: string }[]).map((w) => [w.workspace, m.id] as [string, number]);
    }),
  );
  return toPlacement(pairs.flat());
}

export async function moveWorkspaceToMonitor(workspace: string, monitorId: number): Promise<void> {
  await aerospace("move-workspace-to-monitor", "--workspace", workspace, "--", String(monitorId));
}

export async function moveFocusedWindowToWorkspace(workspace: string): Promise<void> {
  await aerospace("move-node-to-workspace", "--", workspace);
}

/**
 * Toggle tiling on or off, and report which way it went.
 *
 * `enable toggle` says nothing about the resulting state, so this asks for `on` with
 * `--fail-if-noop`: succeeding means it had been off, and failing means it was already
 * on and should be turned off instead. One extra call buys an accurate message.
 */
export async function toggleAerospace(): Promise<"enabled" | "disabled"> {
  try {
    await aerospace("enable", "on", "--fail-if-noop");
    return "enabled";
  } catch {
    await aerospace("enable", "off");
    return "disabled";
  }
}
