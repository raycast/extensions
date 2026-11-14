import { getPreferenceValues } from "@raycast/api";
import { runAppleScript } from "@raycast/utils";
import { accessSync, constants } from "node:fs";
import { readFile } from "node:fs/promises";
import { execFile, spawn } from "node:child_process";
import { homedir } from "node:os";
import { join } from "node:path";
import {
  addJotTakesImages,
  idFromToolReply,
  Jot,
  parseCliError,
  parseMcpList,
  parseShortcut,
  shortcutScript,
  stripFrontmatter,
} from "./parse";

export const GET_JOT_URL = "https://sayjot.xyz/?ref=raycast";

const DEFAULT_PATHS = ["/usr/local/bin/jot", "/Applications/Jot.app/Contents/Helpers/jot"];
const TIMEOUT_MS = 15_000;
/** Jot's MCP view caps structured lists at 200 jots. */
export const LIST_LIMIT = 200;

export class CliNotFoundError extends Error {
  constructor() {
    super("Jot is not installed");
    this.name = "CliNotFoundError";
  }
}

function isExecutable(path: string): boolean {
  try {
    accessSync(path, constants.X_OK);
    return true;
  } catch {
    return false;
  }
}

/** The jot CLI: the preference, then /usr/local/bin/jot, then the app's helper. */
export function findCli(): string | undefined {
  const { cliPath } = getPreferenceValues<Preferences>();
  const candidates = [cliPath?.trim(), ...DEFAULT_PATHS].filter((p): p is string => Boolean(p));
  return candidates.find(isExecutable);
}

function run(args: string[], input?: string, env?: Record<string, string>): Promise<string> {
  const cli = findCli();
  if (!cli) return Promise.reject(new CliNotFoundError());
  return new Promise((resolve, reject) => {
    const child = spawn(cli, args, { env: { ...process.env, ...env }, timeout: TIMEOUT_MS });
    let stdout = "";
    let stderr = "";
    child.stdout.setEncoding("utf8").on("data", (d: string) => (stdout += d));
    child.stderr.setEncoding("utf8").on("data", (d: string) => (stderr += d));
    child.on("error", reject);
    child.on("close", (code, signal) => {
      if (code === 0) return resolve(stdout);
      if (signal) return reject(new Error(`jot timed out (${signal})`));
      reject(new Error(parseCliError(stderr) || `jot exited with code ${code}`));
    });
    child.stdin.on("error", () => undefined);
    child.stdin.end(input ?? "");
  });
}

/**
 * `--vault=<dir>` always goes first: the CLI takes the first --vault/-v it sees, so a jot whose
 * text is "-v" stays text. Without a preference, this asks `jot vault` once.
 */
let settingsVault: Promise<string | undefined> | undefined;
async function vaultArgs(): Promise<string[]> {
  const { vault } = getPreferenceValues<Preferences>();
  if (vault?.trim()) return [`--vault=${vault.trim()}`];
  settingsVault ??= run(["vault"]).then(
    (out) => out.trim() || undefined,
    () => undefined, // No vault folder yet: `add` creates it, so go without the flag.
  );
  const dir = await settingsVault;
  return dir ? [`--vault=${dir}`] : [];
}

async function jot(...args: string[]): Promise<string> {
  return run([...(await vaultArgs()), ...args]);
}

/** One `jot mcp` request over stdio (after the handshake), answered as id 2. */
async function mcpRequest(method: string, params: Record<string, unknown>): Promise<string> {
  const messages = [
    {
      jsonrpc: "2.0",
      id: 1,
      method: "initialize",
      params: {
        protocolVersion: "2025-06-18",
        capabilities: {},
        clientInfo: { name: "Raycast", version: "1.0.0" },
      },
    },
    { jsonrpc: "2.0", method: "notifications/initialized" },
    { jsonrpc: "2.0", id: 2, method, params },
  ];
  const input = messages.map((m) => JSON.stringify(m)).join("\n") + "\n";
  return run([...(await vaultArgs()), "mcp"], input, { JOT_MCP_UI: "1" });
}

/** One MCP tool call. `JOT_MCP_UI=1` adds structured results (tags, dates, sections). */
function mcpCall(name: string, args: Record<string, unknown>): Promise<string> {
  return mcpRequest("tools/call", { name, arguments: args });
}

let imageSupport: Promise<boolean> | undefined;
/** Jot 2.0.1+ lets add_jot take images and pin. Asked once per command run. */
export function canAttachImages(): Promise<boolean> {
  imageSupport ??= mcpRequest("tools/list", {}).then(
    (out) => addJotTakesImages(out, 2),
    () => false,
  );
  return imageSupport;
}

/**
 * Open jots (and done ones when `includeDone`), newest first. The plain `jot list` prints only
 * id, status, and title, so this reads `jot mcp`, which gives tags, dates, and file paths as JSON.
 */
export async function listJots(query: string, includeDone: boolean): Promise<Jot[]> {
  const q = query.trim();
  const stdout = q
    ? await mcpCall("search_jots", { query: q, limit: LIST_LIMIT })
    : await mcpCall("list_jots", includeDone ? { limit: LIST_LIMIT } : { done: false, limit: LIST_LIMIT });
  const jots = parseMcpList(stdout, 2);
  // search_jots has no done filter.
  return includeDone ? jots : jots.filter((j) => j.status === "open");
}

/** Opens a done jot again. The plain CLI has no reopen, so this uses the MCP `set_done` tool. */
export async function reopenJot(id: string): Promise<void> {
  const stdout = await mcpCall("set_done", { id, done: false });
  for (const line of stdout.split("\n")) {
    try {
      const msg = JSON.parse(line);
      if (msg.id !== 2) continue;
      if (msg.error) throw new Error(msg.error.message || "jot mcp failed");
      if (msg.result?.isError) throw new Error(msg.result.content?.[0]?.text || "Could not reopen the jot");
      return;
    } catch (e) {
      if (e instanceof SyntaxError) continue;
      throw e;
    }
  }
  throw new Error("jot mcp gave no answer");
}

export interface NewJot {
  text: string;
  tags?: string[];
  /** "" or undefined is the Inbox. */
  section?: string;
  pin?: boolean;
  /** Image files to attach. Read here and sent as base64, since Jot only takes image bytes. */
  images?: string[];
}

const IMAGE_FILE = /\.(png|jpe?g|gif|webp|heic|heif|tiff?|bmp)$/i;

/** Creates a jot in one write and returns its id. */
export async function addJot(jot: NewJot): Promise<string> {
  // Jot 2.0.2+ records this as where the jot came from; older versions ignore it.
  const args: Record<string, unknown> = { text: jot.text, source: "Raycast" };
  if (jot.tags?.length) args.tags = jot.tags;
  if (jot.section?.trim()) args.section = jot.section.trim();
  if (jot.pin || jot.images?.length) {
    if (!(await canAttachImages())) throw new Error("Update Jot to 2.0.1 or later to pin jots or attach images");
    if (jot.pin) args.pin = true;
  }
  if (jot.images?.length) {
    const bad = jot.images.find((p) => !IMAGE_FILE.test(p));
    if (bad) throw new Error(`${bad.split("/").pop()} is not an image`);
    args.images = await Promise.all(
      jot.images.map(async (path) => ({
        name: path.split("/").pop(),
        data: (await readFile(path)).toString("base64"),
      })),
    );
  }
  return idFromToolReply(await mcpCall("add_jot", args), 2);
}

export async function markDone(id: string): Promise<void> {
  await jot("done", id);
}

export async function archiveJot(id: string): Promise<void> {
  await jot("archive", id);
}

export async function tagJot(id: string, tags: string[]): Promise<void> {
  await jot("tag", id, ...tags);
}

export async function jotPath(id: string): Promise<string> {
  return (await jot("path", id)).trim();
}

/** The jot's Markdown body, without front matter. */
export async function readBody(jot: Jot): Promise<string> {
  const path = jot.path || (await jotPath(jot.id));
  return stripFrontmatter(await readFile(path, "utf8")).trim();
}

export type CaptureShortcut = "voiceCapture" | "drawCapture" | "annotateOut" | "noteCapture";

/**
 * Presses one of Jot's own global shortcuts, read from Jot's settings so a rebound key still
 * works. Raycast needs Accessibility access (it asks once). Jot must be running.
 */
export async function pressJotShortcut(which: CaptureShortcut): Promise<void> {
  const settings = JSON.parse(await readFile(join(homedir(), "Library/Application Support/Jot/settings.json"), "utf8"));
  const script = shortcutScript(parseShortcut(settings[which]));
  if (!script)
    throw new Error("This shortcut is off or can't be pressed from Raycast. Set one in Jot → Settings → Shortcuts.");
  const exec = (file: string, args: string[]) =>
    new Promise<string>((resolve, reject) =>
      execFile(file, args, { timeout: 8000 }, (err, out, stderr) =>
        err ? reject(Object.assign(new Error(stderr.trim() || err.message), { code: err.code })) : resolve(out),
      ),
    );
  // Jot's hotkeys only work while it runs, so start it in the background first.
  const running = await exec("/usr/bin/pgrep", ["-f", "Jot.app/Contents/MacOS/Jot"]).then(
    () => true,
    () => false,
  );
  if (!running) {
    await exec("/usr/bin/open", ["-g", "-a", "Jot"]);
    await new Promise((r) => setTimeout(r, 1500));
  }
  await runAppleScript(script, [], { timeout: 8000 });
}
