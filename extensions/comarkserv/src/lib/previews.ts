import { createHash } from "node:crypto";
import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  realpathSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { homedir } from "node:os";
import { basename, dirname, join } from "node:path";
import { LocalStorage } from "@raycast/api";
import { preferences, startComarkserv } from "./comarkserv";

/**
 * The state directory, shared with the Raycast script commands of comarkserv.
 * Each server has a file: line 1 is "pid url", line 2 the folder, line 3 the theme.
 */
const STATE = join(process.env.XDG_STATE_HOME || join(homedir(), ".local", "state"), "comarkserv", "raycast");

export interface Preview {
  key: string;
  pid: number;
  url: string;
  root: string;
  theme: string;
}

export interface Recent {
  root: string;
  file?: string;
  time: number;
}

const MAX_RECENTS = 20;
const START_TIMEOUT = 90_000;

function keyOf(root: string): string {
  return createHash("sha1").update(root).digest("hex").slice(0, 16);
}

function isRunning(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

function readPreview(key: string): Preview | undefined {
  const file = join(STATE, key);
  if (!existsSync(file)) return undefined;
  const [first = "", root = "", theme = ""] = readFileSync(file, "utf8").split("\n");
  const [pid, url] = first.split(" ");
  const id = Number(pid);
  if (!url || !Number.isInteger(id) || !isRunning(id)) {
    rmSync(file, { force: true });
    rmSync(`${file}.log`, { force: true });
    return undefined;
  }
  return { key, pid: id, url, root, theme };
}

/** Returns the running previews. It removes the files of servers that stopped. */
export function listPreviews(): Preview[] {
  if (!existsSync(STATE)) return [];
  return readdirSync(STATE)
    .filter((name) => !name.endsWith(".log"))
    .map(readPreview)
    .filter((preview): preview is Preview => preview !== undefined)
    .sort((a, b) => basename(a.root).localeCompare(basename(b.root)));
}

export function stopPreview(preview: Preview): void {
  // The server runs in its own process group, which also holds npx and its children.
  for (const target of [-preview.pid, preview.pid]) {
    try {
      process.kill(target, "SIGTERM");
      break;
    } catch {
      // The group or the process is already gone.
    }
  }
  rmSync(join(STATE, preview.key), { force: true });
  rmSync(join(STATE, `${preview.key}.log`), { force: true });
}

export async function defaultTheme(): Promise<string> {
  return (await LocalStorage.getItem<string>("theme")) || preferences().theme?.trim() || "github";
}

async function waitForUrl(log: string, pid: number): Promise<string> {
  const deadline = Date.now() + START_TIMEOUT;
  while (Date.now() < deadline) {
    const text = existsSync(log) ? readFileSync(log, "utf8") : "";
    const url = /Local\s+(https?:\/\/\S+)/.exec(text)?.[1];
    if (url) return url;
    if (!isRunning(pid)) {
      const last = text.trim().split("\n").at(-1);
      throw new Error(last || "comarkserv stopped before it was ready.");
    }
    await new Promise((resolve) => setTimeout(resolve, 150));
  }
  throw new Error("comarkserv did not start in time.");
}

/**
 * Serves a folder, or the folder of a file, and returns the URL to open. A folder
 * that has a server already uses it, unless the theme is different.
 */
export async function startPreview(target: string, theme: string): Promise<{ url: string; root: string }> {
  const isDirectory = statSync(target).isDirectory();
  const root = realpathSync(isDirectory ? target : dirname(target));
  const file = isDirectory ? "" : basename(target);
  const key = keyOf(root);
  let preview = readPreview(key);
  // The script commands write no theme, so an unknown theme does not start a new server.
  if (preview && preview.theme && preview.theme !== theme) {
    stopPreview(preview);
    preview = undefined;
  }
  if (!preview) {
    mkdirSync(STATE, { recursive: true });
    const log = join(STATE, `${key}.log`);
    const args = [root, "--silent", ...(theme && theme !== "github" ? ["--theme", theme] : [])];
    const pid = startComarkserv(args, log);
    const url = await waitForUrl(log, pid);
    writeFileSync(join(STATE, key), `${pid} ${url}\n${root}\n${theme}\n`);
    preview = { key, pid, url, root, theme };
  }
  await addRecent({ root, file: file || undefined, time: Date.now() });
  return { url: preview.url + (file ? encodeURIComponent(file) : ""), root };
}

export async function getRecents(): Promise<Recent[]> {
  const stored = await LocalStorage.getItem<string>("recents");
  try {
    return stored ? (JSON.parse(stored) as Recent[]) : [];
  } catch {
    return [];
  }
}

async function addRecent(recent: Recent): Promise<void> {
  const list = (await getRecents()).filter((item) => item.root !== recent.root);
  await LocalStorage.setItem("recents", JSON.stringify([recent, ...list].slice(0, MAX_RECENTS)));
}

export async function removeRecent(root: string): Promise<void> {
  const list = (await getRecents()).filter((item) => item.root !== root);
  await LocalStorage.setItem("recents", JSON.stringify(list));
}
