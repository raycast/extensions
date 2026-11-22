import { getPreferenceValues, open, showHUD } from "@raycast/api";
export { FailedView } from "./failed-view";
import { execFile } from "node:child_process";
import { existsSync } from "node:fs";
import { homedir } from "node:os";

/** A tab as `nxtrm call list_tabs` gives it. */
export interface Tab {
  id: string;
  title: string;
  directory: string;
  program?: string;
  state?: string;
  agent?: boolean;
  question?: string;
  front?: boolean;
}

export interface Window {
  name: string;
  project?: string;
  tabs: Tab[];
}

export interface Projects {
  open: string[];
  recent: string[];
}

const appPaths = ["/Applications/Next Term.app", `${homedir()}/Applications/Next Term.app`];

/** Next Term's command line tool: the preference, else the one inside Next Term.app. */
export function nxtrmPath(): string {
  const chosen = getPreferenceValues<Preferences>().nxtrm?.trim();
  if (chosen) return chosen.replace(/^~(?=\/)/, homedir());
  for (const app of appPaths) {
    const tool = `${app}/Contents/Resources/bin/nxtrm`;
    if (existsSync(tool)) return tool;
  }
  throw new Error("Next Term isn't in Applications. Set its nxtrm path in this extension's preferences.");
}

/** One of Next Term's tools (`nxtrm call`), its answer parsed as JSON. */
export function call<T>(tool: string, args: Record<string, unknown> = {}): Promise<T> {
  return new Promise((resolve, reject) => {
    let path: string;
    try {
      path = nxtrmPath();
    } catch (error) {
      return reject(error);
    }
    execFile(path, ["call", tool, JSON.stringify(args)], { timeout: 60_000 }, (error, stdout, stderr) => {
      if (error) {
        const text = (stderr || error.message).replace(/^nxtrm call: /, "").trim();
        return reject(new Error(text || "Next Term didn't answer. Is it running?"));
      }
      try {
        resolve(JSON.parse(stdout) as T);
      } catch {
        reject(new Error(stdout.trim() || "Next Term's answer wasn't JSON."));
      }
    });
  });
}

/** A nextterm:// link, as a launcher opens it. */
export async function link(action: string, query: Record<string, string> = {}): Promise<void> {
  const search = new URLSearchParams(query).toString();
  await open(`nextterm://${action}${search ? `?${search}` : ""}`);
}

export async function allTabs(): Promise<(Tab & { window: string })[]> {
  const answer = await call<{ windows: Window[] }>("list_tabs");
  return answer.windows.flatMap((window) => window.tabs.map((tab) => ({ ...tab, window: window.name })));
}

export function shown(path: string): string {
  const home = homedir();
  return path === home ? "~" : path.startsWith(home + "/") ? "~" + path.slice(home.length) : path;
}

export function name(path: string): string {
  return path.split("/").filter(Boolean).pop() ?? path;
}

/** Projects worth listing: no agents' scratch folders. */
export function projects(answer: Projects): { path: string; open: boolean }[] {
  const scratch = (path: string) => path.startsWith("/private/tmp/") || path.startsWith("/tmp/");
  const open = answer.open.filter((path) => !scratch(path));
  const recent = answer.recent.filter((path) => !scratch(path) && !open.includes(path));
  return [...open.map((path) => ({ path, open: true })), ...recent.map((path) => ({ path, open: false }))];
}

export async function failed(error: unknown): Promise<void> {
  await showHUD(error instanceof Error ? error.message : String(error));
}

export const agents = [
  { command: "claude", title: "Claude Code" },
  { command: "codex", title: "Codex" },
  { command: "opencode", title: "OpenCode" },
  { command: "gemini", title: "Gemini CLI" },
  { command: "cmd", title: "Command Code" },
];
