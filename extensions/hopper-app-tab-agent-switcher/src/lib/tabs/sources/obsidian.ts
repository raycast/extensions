// Obsidian: the tabs of every open vault, in all its windows (main and popouts), with each note's folder as
// detail. Obsidian's app list (obsidian.json) marks the vaults with an open window, and each vault saves its
// layout to workspace.json in its config folder (.obsidian, or another dot-folder set with "Override config
// folder"; synced vaults can have both, one per device, so the newest wins) within a second of any change: every tab (a leaf), its file, and the
// active one. Sidebar leaves (file explorer, search...) are not tabs and are skipped, as are empty "New tab"s.
//
// Selecting presses the tab's header through Accessibility: Obsidian's web UI marks it with the DOM class
// "workspace-tab-header" and labels it with the tab's title. Its obsidian:// URI can't be used for that: it
// always opens the note in the current tab (replacing it) or a new one, never switches to where it's open.
// Tabs with the same title are told apart by position, in the main window or across the popouts (whose editor
// area has the extra class "workspace-window"). Popouts are searched front to back, not in workspace.json's
// order, so only two popouts with same-titled tabs can mix them up.

import {
  TabGoneError,
  type App,
  type Platform,
  type ReopenTarget,
  type Tab,
  type TabSource,
  type WebElementQuery,
} from "../model";
import { shortPath } from "./notion";
import { fromWindows } from "./windows";

const BUNDLE_ID = "md.obsidian";
const APP_DIR = "Library/Application Support/obsidian";
const SEPARATOR = " / ";
/** DOM class of a popout window's editor area. */
const POPOUT = "workspace-window";

interface Ref {
  vault: string;
  vaultId: string;
  /** Path inside the vault; absent for views that aren't a file (graph...). */
  file?: string;
  /** In a popout window rather than the main one. */
  popout: boolean;
  /** Which of the tabs titled like this one to press: in the main window, or across the popouts. */
  occurrence: number;
}

export interface Vault {
  id: string;
  path: string;
  /** When the vault was last opened, for ordering. */
  ts: number;
}

/** The vaults with an open window, from obsidian.json, most recently opened first. */
export function parseVaults(text: string): Vault[] {
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    return [];
  }
  const vaults = (json as { vaults?: Record<string, { path?: unknown; ts?: unknown; open?: unknown }> })?.vaults;
  if (!vaults || typeof vaults !== "object") return [];
  return Object.entries(vaults)
    .filter(([, v]) => v?.open === true && typeof v.path === "string")
    .map(([id, v]) => ({ id, path: v.path as string, ts: typeof v.ts === "number" ? v.ts : 0 }))
    .sort((a, b) => b.ts - a.ts);
}

/** The vault's name: its folder's name, as Obsidian shows it in window titles. */
export function vaultName(path: string): string {
  return path.replace(/\/+$/, "").split("/").pop() ?? path;
}

interface Node {
  id?: string;
  type?: string;
  children?: Node[];
  state?: { type?: string; state?: { file?: unknown }; title?: unknown };
}

interface Leaf {
  id: string;
  title: string;
  file?: string;
}

function leaves(node: Node | undefined): Leaf[] {
  if (!node) return [];
  if (node.type !== "leaf") return (node.children ?? []).flatMap(leaves);
  const view = node.state;
  if (!view || view.type === "empty" || typeof node.id !== "string") return [];
  const file = typeof view.state?.file === "string" ? view.state.file : undefined;
  const base = file?.split("/").pop()?.replace(/\.md$/, "");
  const title = typeof view.title === "string" && view.title ? view.title : base;
  return title ? [{ id: node.id, title, file }] : [];
}

/** Tabs of one vault from its workspace.json: the main window's, then each popout's. */
export function fromWorkspace(app: App, vault: Vault, text: string): Tab<Ref>[] {
  let workspace: { main?: Node; floating?: Node; active?: unknown };
  try {
    workspace = JSON.parse(text);
  } catch {
    return [];
  }
  const name = vaultName(vault.path);
  const windows = [workspace?.main, ...(workspace?.floating?.children ?? [])].map(leaves);
  const placed = windows.flatMap((windowLeaves, w) => windowLeaves.map((leaf) => ({ leaf, popout: w > 0 })));
  return placed.map(({ leaf, popout }, i): Tab<Ref> => {
    const folders = leaf.file?.split("/").slice(0, -1) ?? [];
    const path = [name, ...folders];
    const before = placed.slice(0, i).filter((p) => p.popout === popout && p.leaf.title === leaf.title);
    return {
      key: `${BUNDLE_ID}:${vault.id}:${leaf.id}`,
      app,
      source: obsidian.id,
      kind: "tab",
      title: leaf.title,
      detail: shortPath([...path].reverse()),
      detailFull: path.join(SEPARATOR),
      active: leaf.id === workspace.active,
      ref: { vault: name, vaultId: vault.id, file: leaf.file, popout, occurrence: before.length },
    };
  });
}

/** Where the tab's header is: the vault's windows, in the main window's editor area or a popout's. */
export function headerQuery(ref: Ref): WebElementQuery {
  const area = ref.popout ? { within: POPOUT } : { within: "mod-root", outside: POPOUT };
  return { window: ` - ${ref.vault} - Obsidian`, ...area, className: "workspace-tab-header" };
}

/** The URI that opens `file` of the vault in a new tab. */
export function openUri(vaultId: string, file: string): string {
  return `obsidian://open?vault=${encodeURIComponent(vaultId)}&file=${encodeURIComponent(file)}&paneType=tab`;
}

async function readText(dir: string, name: RegExp, platform: Platform): Promise<string | undefined> {
  return (await platform.readFiles(dir, name, 0))[0]?.text;
}

/** The vault's layout: the most recently saved workspace.json among its dot-folders. */
async function workspaceText(vaultPath: string, platform: Platform): Promise<string> {
  const dirs = (await platform.listDir(vaultPath)).filter((d) => d.startsWith(".") && d !== ".trash");
  const files = await Promise.all(
    dirs.map((d) => platform.readFiles(`${vaultPath}/${d}`, /^workspace\.json$/, 0).catch(() => [])),
  );
  const newest = files.flat().sort((a, b) => (b.modified ?? 0) - (a.modified ?? 0))[0];
  return newest?.text ?? "";
}

export const obsidian: TabSource<Ref> = {
  id: "obsidian",
  bundleIds: [BUNDLE_ID],
  list: async (app, platform) => {
    const appList = await readText(`${platform.homeDir()}/${APP_DIR}`, /^obsidian\.json$/, platform);
    const vaults = parseVaults(appList ?? "");
    const layouts = await Promise.all(vaults.map((vault) => workspaceText(vault.path, platform)));
    const tabs = vaults.flatMap((vault, i) => fromWorkspace(app, vault, layouts[i]));
    if (tabs.length > 0) return tabs;
    // Obsidian runs, so it has its app list, and each open vault its layout: without them, a new Obsidian moved them.
    const drift =
      appList === undefined
        ? "Obsidian runs but has no obsidian.json"
        : vaults.length > 0 && layouts.every((text) => !text)
          ? "Obsidian's open vaults have no workspace.json"
          : undefined;
    if (drift) platform.reportError(new Error(drift), "tabs: obsidian layout");
    // No layout found (a new format): offer Obsidian's windows instead.
    const all = await platform.windows([app.bundleId]);
    return fromWindows(app, all.find((w) => w.bundleId === app.bundleId)?.windows ?? []) as Tab[] as Tab<Ref>[];
  },
  // Window entries carry source "windows", so their selection is routed there, not here.
  select: async (tab, platform) => {
    if (await platform.pressWebElement(tab.app.bundleId, headerQuery(tab.ref), tab.title, tab.ref.occurrence)) return;
    // Closed since listing, or its header is labeled differently (a plugin renaming tabs): open the note.
    if (!tab.ref.file) throw new TabGoneError();
    await platform.openUrl(openUri(tab.ref.vaultId, tab.ref.file));
  },
  reopenTarget: (tab): ReopenTarget | undefined =>
    tab.ref.file ? { kind: "url", target: openUri(tab.ref.vaultId, tab.ref.file) } : undefined,
};
