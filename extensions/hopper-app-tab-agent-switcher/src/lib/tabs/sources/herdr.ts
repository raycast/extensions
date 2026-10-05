// herdr (herdr.dev), a terminal multiplexer: workspace → tab → pane, inside whatever terminal runs a herdr client.
// Listed: each workspace, and its tabs that have their own name. It isn't an app, so it's a *discovered* source (registry.ts): its tabs are listed under the terminal app running
// herdr, found through the parent chain of the client attached to that session (connected to its herdr-client.sock); in terminals that report panes (iTerm, cmux, Terminal)
// the client's tty also finds the terminal tab holding herdr, which is selected with it (Tab.within). One `session.snapshot` request on herdr's local socket
// (one per named session) returns every workspace, tab, pane and agent; `tab.focus` / `pane.focus` switch herdr's
// clients there. The agent level reads the same snapshot for herdr's agents (agents/sources/herdr.ts; ADR-023),
// which point at these tabs and their panes; selecting a pane is this source's (selectPane; ADR-028).

import { appOfProcess, herdrClient } from "../../platform/processes";
import { focusTerminalNamed, GHOSTTY } from "./ghostty";
import type { Process } from "../../platform/model";
import type { App, Platform, Tab, TabSource } from "../model";

const CONFIG_DIR = ".config/herdr";

/** A workspace entry, or a tab entry. */
type Ref = { socket: string; workspaceId: string; tabId?: undefined } | { socket: string; tabId: string };

export interface Snapshot {
  focused_workspace_id?: string;
  focused_tab_id?: string;
  workspaces?: { workspace_id?: string; label?: string; number?: number }[];
  tabs?: { tab_id?: string; workspace_id?: string; label?: string; number?: number; pane_count?: number }[];
  panes?: { pane_id?: string; tab_id?: string; cwd?: string; foreground_cwd?: string }[];
  agents?: HerdrAgent[];
}

export interface HerdrAgent {
  pane_id?: string;
  workspace_id?: string;
  tab_id?: string;
  name?: string;
  agent?: string;
  display_agent?: string;
  title?: string;
  terminal_title_stripped?: string;
  agent_status?: string;
  agent_session?: { agent?: string; kind?: string; value?: string };
  cwd?: string;
  foreground_cwd?: string;
}

/** The app whose terminal runs a client of the session at `socket`, and that client's tty. */
export function clientOf(socket: string, processes: Process[], apps: App[]): { app: App; tty: string } | undefined {
  const client = herdrClient(processes, socket);
  const app = client && appOfProcess(client.pid, new Map(processes.map((p) => [p.pid, p])), apps);
  return app && client ? { app, tty: client.tty } : undefined;
}

/** Socket paths of the default session and every named one. */
export async function socketPaths(platform: Platform): Promise<string[]> {
  const base = `${platform.homeDir()}/${CONFIG_DIR}`;
  const [top, sessions] = await Promise.all([platform.listDir(base), platform.listDir(`${base}/sessions`)]);
  const named = await Promise.all(
    sessions.map(async (name) =>
      (await platform.listDir(`${base}/sessions/${name}`)).includes("herdr.sock")
        ? [`${base}/sessions/${name}/herdr.sock`]
        : [],
    ),
  );
  return [...(top.includes("herdr.sock") ? [`${base}/herdr.sock`] : []), ...named.flat()];
}

/** The snapshot in a `session.snapshot` response, or undefined. */
export function snapshotOf(response: unknown): Snapshot | undefined {
  return (response as { result?: { snapshot?: Snapshot } })?.result?.snapshot;
}

/**
 * Every reachable session's snapshot; sessions that don't answer (herdr not running) are skipped. Other failures
 * (an answer that isn't JSON, or has no snapshot: herdr's protocol changed) are reported.
 */
export async function readSnapshots(
  platform: Platform,
  sockets?: string[],
): Promise<{ socket: string; snapshot: Snapshot }[]> {
  sockets ??= await socketPaths(platform);
  const results = await Promise.all(
    sockets.map((socket) =>
      platform
        .socketRequest(socket, { id: "hopper", method: "session.snapshot", params: {} })
        .then((response) => {
          const snapshot = snapshotOf(response);
          if (!snapshot)
            platform.reportError(new Error("herdr's session.snapshot has no snapshot"), "tabs: herdr snapshot");
          return snapshot ? [{ socket, snapshot }] : [];
        })
        .catch((error: unknown) => {
          platform.reportError(error, "tabs: herdr snapshot");
          return [];
        }),
    ),
  );
  return results.flat();
}

export const herdrWorkspaceKey = (socket: string, workspaceId: string) => `herdr:${socket}:${workspaceId}`;
export const herdrTabKey = (socket: string, tabId: string) => `herdr:${socket}:${tabId}`;

/** "1", "2"... are herdr's own labels for tabs the user didn't name. */
const isUnnamed = (label?: string) => !label || /^\d+$/.test(label);

/** "Workspace 2" for workspaces the user didn't name. */
export function workspaceName(snapshot: Snapshot, workspaceId?: string): string {
  const w = snapshot.workspaces?.find((x) => x.workspace_id === workspaceId);
  return w?.label || (w?.number !== undefined ? `Workspace ${w.number}` : "Workspace");
}

/** Whether a tab gets an entry of its own: it's named, or its workspace has other tabs. */
function listsTab(snapshot: Snapshot, tab: NonNullable<Snapshot["tabs"]>[number]): boolean {
  const siblings = (snapshot.tabs ?? []).filter((t) => t.workspace_id === tab.workspace_id);
  return !isUnnamed(tab.label) || siblings.length > 1;
}

/**
 * Key of the entry that shows a tab: its own, or its workspace's when it has none. Agents in herdr point at it
 * (Agent.placeKey), so Search shows their status there.
 */
export function herdrPlaceKey(snapshot: Snapshot, socket: string, tabId: string): string | undefined {
  const tab = snapshot.tabs?.find((t) => t.tab_id === tabId);
  if (!tab) return undefined;
  if (listsTab(snapshot, tab)) return herdrTabKey(socket, tabId);
  return tab.workspace_id ? herdrWorkspaceKey(socket, tab.workspace_id) : undefined;
}

/**
 * herdr's places under the terminal app running herdr: each workspace, then its tabs that have a name of their own
 * (or all of them, when it has several).
 */
export function fromSnapshot(app: App, socket: string, snapshot: Snapshot, hostTty?: string): Tab<Ref>[] {
  const cwdOf = (tabId?: string) => {
    const pane = snapshot.panes?.find((p) => p.tab_id === tabId);
    return pane?.foreground_cwd || pane?.cwd;
  };
  const host = hostTty ? { hostTty } : {};
  return (snapshot.workspaces ?? []).flatMap((w): Tab<Ref>[] => {
    if (!w.workspace_id) return [];
    const workspace = workspaceName(snapshot, w.workspace_id);
    const tabs = (snapshot.tabs ?? []).filter((t) => t.workspace_id === w.workspace_id && t.tab_id);
    return [
      {
        key: herdrWorkspaceKey(socket, w.workspace_id),
        app,
        source: herdr.id,
        kind: "workspace",
        title: workspace,
        detail: "herdr",
        detailFull: cwdOf(tabs[0]?.tab_id),
        active: w.workspace_id === snapshot.focused_workspace_id,
        ref: { socket, workspaceId: w.workspace_id },
        ...host,
      },
      ...tabs
        .filter((t) => listsTab(snapshot, t))
        .map((t): Tab<Ref> => ({
          key: herdrTabKey(socket, t.tab_id!),
          app,
          source: herdr.id,
          kind: "tab",
          title: isUnnamed(t.label) ? `${workspace} ${t.label ?? ""}`.trim() : t.label!,
          detail: `herdr › ${workspace}`,
          detailFull: cwdOf(t.tab_id),
          active: t.tab_id === snapshot.focused_tab_id,
          ref: { socket, tabId: t.tab_id! },
          ...host,
        })),
    ];
  });
}

async function focus(platform: Platform, socket: string, method: string, params: object): Promise<void> {
  const response = (await platform.socketRequest(socket, { id: "hopper", method, params })) as {
    error?: { message?: string };
  };
  if (response?.error) throw new Error(response.error.message ?? `herdr couldn't ${method}`);
}

/**
 * Bring forward the terminal running herdr's client, where the terminal can't be found by tty (Ghostty): herdr
 * sets its terminal's title to a one-off marker (its own API, `client.window_title.set`), Ghostty's terminal with
 * that title is focused, and the title is cleared. The same way the Raycast Store's Herdr extension does it.
 */
export async function revealClient(platform: Platform, socket: string, app: App): Promise<void> {
  if (app.bundleId !== GHOSTTY) return;
  const marker = `hopper-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  const request = (method: string, params: object) =>
    platform.socketRequest(socket, { id: "hopper", method, params }).catch(() => undefined);
  try {
    const set = (await request("client.window_title.set", { title: marker })) as { result?: { changed?: boolean } };
    if (set?.result?.changed === false) return;
    await focusTerminalNamed(platform, marker).catch((error: unknown) =>
      platform.reportError(error, "tabs: herdr reveal"),
    );
  } finally {
    await request("client.window_title.clear", {});
  }
}

export const herdr: TabSource<Ref> = {
  id: "herdr",
  bundleIds: [],
  list: async () => [],
  discover: async (apps, platform) => {
    const [sockets, processes] = await Promise.all([socketPaths(platform), platform.processes()]);
    // herdr runs, so it has a socket: without one, a new herdr moved it.
    if (sockets.length === 0 && processes.some((p) => p.name === "herdr")) {
      platform.reportError(new Error("herdr runs but has no herdr.sock"), "tabs: herdr socket");
    }
    const snapshots = await readSnapshots(platform, sockets);
    if (snapshots.length === 0) return [];
    return snapshots.flatMap(({ socket, snapshot }) => {
      const client = clientOf(socket, processes, apps);
      // No client attached in a terminal we know: nothing to bring forward, so nothing to jump to.
      return client ? fromSnapshot(client.app, socket, snapshot, client.tty) : [];
    });
  },
  select: async (tab, platform) => {
    const { ref } = tab;
    if (ref.tabId !== undefined) await focus(platform, ref.socket, "tab.focus", { tab_id: ref.tabId });
    else await focus(platform, ref.socket, "workspace.focus", { workspace_id: ref.workspaceId });
    if (!tab.within) await revealClient(platform, ref.socket, tab.app);
  },
  /** A pane of the tab (an agent's, from herdr's snapshot): herdr's clients switch to its workspace, tab and pane. */
  selectPane: async (tab, paneId, platform) => {
    await focus(platform, tab.ref.socket, "pane.focus", { pane_id: paneId });
    if (!tab.within) await revealClient(platform, tab.ref.socket, tab.app);
  },
};
