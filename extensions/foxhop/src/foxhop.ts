import { execFile } from "child_process";
import { promisify } from "util";
import { getPreferenceValues } from "@raycast/api";

const execFileAsync = promisify(execFile);

export type Target = {
  name: string;
  title?: string;
  match: string;
  url?: string;
  strategy?: "hostname" | "prefix" | "exact" | "search";
  pick?: "recent" | "first" | "pinned";
  navigate?: boolean;
  favorite?: boolean;
};

export type FirefoxTab = {
  id: number;
  title: string;
  url: string;
  windowId: number;
  index: number;
  pinned: boolean;
  lastAccessed: number;
  favIconUrl?: string;
};

export type UpsertOptions = {
  url?: string;
  title?: string;
  match?: string;
  strategy?: string;
  pick?: string;
  navigate?: boolean;
};

export type EditOptions = {
  url: string;
  title: string;
  match: string;
  strategy: string;
  pick: string;
  navigate: boolean;
};

const buildEnv = (browser: string): NodeJS.ProcessEnv => ({
  ...process.env,
  PATH: [
    `${process.env.HOME}/.npm-global/bin`,
    `${process.env.HOME}/.local/share/mise/shims`,
    "/opt/homebrew/bin",
    "/usr/local/bin",
    "/usr/bin",
    "/bin",
    process.env.PATH ?? "",
  ].join(":"),
  FOXHOP_BROWSER: browser,
});

const run = async (args: string[]): Promise<string> => {
  const { foxhopPath, browser } = getPreferenceValues<Preferences>();
  // execFile rejects on a non-zero exit code, which is the real failure signal.
  // stderr alone is NOT an error — mise shims / Node can write warnings there on success.
  const { stdout } = await execFileAsync(foxhopPath, args, {
    env: buildEnv(browser),
  });
  return stdout.trim();
};

export const listTargets = async (): Promise<Target[]> => {
  const output = await run(["list", "--json"]);
  return JSON.parse(output) as Target[];
};

export const focusTarget = async (name: string): Promise<void> => {
  await run(["focus", name]);
};

// Adds a target; the CLI derives its id from the title and never overwrites a
// different target.
export const addTarget = async (opts: UpsertOptions): Promise<void> => {
  const args = ["add"];
  if (opts.url) args.push(opts.url);
  if (opts.title) args.push("--title", opts.title);
  if (opts.match) args.push("--match", opts.match);
  if (opts.strategy) args.push("--strategy", opts.strategy);
  if (opts.pick) args.push("--pick", opts.pick);
  if (opts.navigate) args.push("--navigate");
  await run(args);
};

// Edits a target in place; its id never changes. An empty title or URL clears it.
export const editTarget = async (name: string, opts: EditOptions): Promise<void> => {
  // The --flag=value form keeps a value that starts with a dash from being read as a flag.
  await run([
    "edit",
    name,
    `--title=${opts.title}`,
    `--url=${opts.url}`,
    `--match=${opts.match}`,
    `--strategy=${opts.strategy}`,
    `--pick=${opts.pick}`,
    opts.navigate ? "--navigate" : "--no-navigate",
  ]);
};

export const removeTarget = async (name: string): Promise<void> => {
  await run(["remove", name]);
};

export const toggleFavorite = async (name: string): Promise<void> => {
  await run(["fav", name]);
};

export const listOpenTabs = async (): Promise<FirefoxTab[]> => {
  const output = await run(["tabs", "--json"]);
  return JSON.parse(output) as FirefoxTab[];
};

export type SyncResult = {
  dir: string;
  written: number;
  removed: number;
};

export const syncScripts = async (): Promise<SyncResult> => {
  const output = await run(["sync", "--json"]);
  return JSON.parse(output) as SyncResult;
};

export const clearScripts = async (): Promise<SyncResult> => {
  const output = await run(["sync", "--clean", "--json"]);
  return JSON.parse(output) as SyncResult;
};
