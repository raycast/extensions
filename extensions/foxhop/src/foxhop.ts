import { execFile } from "child_process";
import { promisify } from "util";
import { getPreferenceValues } from "@raycast/api";

const execFileAsync = promisify(execFile);

type Preferences = {
  foxhopPath: string;
  browser: string;
};

export type Target = {
  name: string;
  title?: string;
  match: string;
  url?: string;
  strategy?: "hostname" | "prefix" | "exact" | "search";
  pick?: "recent" | "first" | "pinned";
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
  name: string;
  match: string;
  title?: string;
  url?: string;
  strategy?: string;
  pick?: string;
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

export const upsertTarget = async (opts: UpsertOptions): Promise<void> => {
  const args = ["add", opts.name, "--match", opts.match];
  if (opts.title) args.push("--title", opts.title);
  if (opts.url) args.push("--url", opts.url);
  if (opts.strategy) args.push("--strategy", opts.strategy);
  if (opts.pick) args.push("--pick", opts.pick);
  await run(args);
};

export const removeTarget = async (name: string): Promise<void> => {
  await run(["remove", name]);
};

export const listOpenTabs = async (): Promise<FirefoxTab[]> => {
  const output = await run(["tabs", "--json"]);
  return JSON.parse(output) as FirefoxTab[];
};

export const syncScripts = async (): Promise<string> => {
  return run(["sync"]);
};
