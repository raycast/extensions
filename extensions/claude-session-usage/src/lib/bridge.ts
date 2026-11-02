import { chmod, copyFile, mkdir, readFile, rename, rm, stat, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { BRIDGE_DATA_FILE, CLAUDE_DIR } from "./claude-code-source";

export const SETTINGS_FILE = join(CLAUDE_DIR, "settings.json");
export const BRIDGE_SCRIPT = join(CLAUDE_DIR, "usage-ring-statusline.sh");
export const BRIDGE_STATE_FILE = join(CLAUDE_DIR, "usage-ring-bridge.json");
export const BRIDGE_COMMAND = "~/.claude/usage-ring-statusline.sh";

type StatusLine = { type?: string; command?: string; [key: string]: unknown };
type Settings = { statusLine?: StatusLine; [key: string]: unknown };
type BridgeState = { previousStatusLine: StatusLine | null };

export type BridgeStatus = {
  installed: boolean;
  dataUpdatedAt: number | null;
  passthroughCommand: string | null;
};

export class BridgeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "BridgeError";
  }
}

const shellQuote = (s: string) => `'${s.replace(/'/g, `'\\''`)}'`;

export function isBridgeCommand(command: unknown): boolean {
  return typeof command === "string" && command.includes("usage-ring-statusline.sh");
}

export function buildBridgeScript(passthroughCommand?: string | null): string {
  const lines = [
    "#!/bin/sh",
    "input=$(cat)",
    'out="$HOME/.claude/usage-ring.json"',
    'tmp="$out.$$.tmp"',
    'if printf \'%s\' "$input" | /usr/bin/plutil -extract rate_limits json -o "$tmp" - 2>/dev/null; then',
    '  mv -f "$tmp" "$out"',
    "else",
    '  rm -f "$tmp"',
    "fi",
  ];
  if (passthroughCommand) lines.push(`printf '%s' "$input" | /bin/sh -c ${shellQuote(passthroughCommand)}`);
  return lines.join("\n") + "\n";
}

export function withBridge(settings: Settings): { settings: Settings; previous: StatusLine | null } {
  const previous = settings.statusLine && !isBridgeCommand(settings.statusLine.command) ? settings.statusLine : null;
  const base = previous ? { ...previous } : {};
  return {
    previous,
    settings: { ...settings, statusLine: { ...base, type: "command", command: BRIDGE_COMMAND } },
  };
}

export function withoutBridge(settings: Settings, previous: StatusLine | null): Settings {
  const next: Settings = { ...settings };
  if (!isBridgeCommand(next.statusLine?.command)) return next;
  if (previous) next.statusLine = previous;
  else delete next.statusLine;
  return next;
}

async function readJson<T>(file: string, fallback: T): Promise<T> {
  let raw: string;
  try {
    raw = await readFile(file, "utf8");
  } catch {
    return fallback;
  }
  try {
    return JSON.parse(raw) as T;
  } catch {
    throw new BridgeError(`${file} is not valid JSON. Fix it, then try again.`);
  }
}

async function writeJsonAtomic(file: string, data: unknown): Promise<void> {
  const tmp = `${file}.${process.pid}.tmp`;
  await writeFile(tmp, JSON.stringify(data, null, 2) + "\n", "utf8");
  await rename(tmp, file);
}

async function mtime(file: string): Promise<number | null> {
  try {
    return (await stat(file)).mtimeMs;
  } catch {
    return null;
  }
}

export async function isBridgeConnected(settingsFile = SETTINGS_FILE, script = BRIDGE_SCRIPT): Promise<boolean> {
  if ((await mtime(script)) === null) return false;
  const settings = await readJson<Settings>(settingsFile, {}).catch(() => ({}) as Settings);
  return isBridgeCommand(settings.statusLine?.command);
}

export async function getBridgeStatus(): Promise<BridgeStatus> {
  const state = await readJson<BridgeState>(BRIDGE_STATE_FILE, { previousStatusLine: null }).catch(() => null);
  const prev = state?.previousStatusLine?.command;
  return {
    installed: await isBridgeConnected(),
    dataUpdatedAt: await mtime(BRIDGE_DATA_FILE),
    passthroughCommand: typeof prev === "string" ? prev : null,
  };
}

export async function installBridge(): Promise<void> {
  await mkdir(CLAUDE_DIR, { recursive: true });
  const settings = await readJson<Settings>(SETTINGS_FILE, {});
  if (isBridgeCommand(settings.statusLine?.command)) {
    const state = await readJson<BridgeState>(BRIDGE_STATE_FILE, { previousStatusLine: null });
    await writeFile(BRIDGE_SCRIPT, buildBridgeScript(state.previousStatusLine?.command), "utf8");
    await chmod(BRIDGE_SCRIPT, 0o755);
    return;
  }

  const { settings: next, previous } = withBridge(settings);
  if (await mtime(SETTINGS_FILE)) await copyFile(SETTINGS_FILE, `${SETTINGS_FILE}.usage-ring.bak`);

  await writeJsonAtomic(BRIDGE_STATE_FILE, { previousStatusLine: previous } satisfies BridgeState);
  await writeFile(BRIDGE_SCRIPT, buildBridgeScript(previous?.command), "utf8");
  await chmod(BRIDGE_SCRIPT, 0o755);
  await writeJsonAtomic(SETTINGS_FILE, next);
}

export async function uninstallBridge(): Promise<void> {
  const settings = await readJson<Settings>(SETTINGS_FILE, {});
  const state = await readJson<BridgeState>(BRIDGE_STATE_FILE, { previousStatusLine: null });
  if (isBridgeCommand(settings.statusLine?.command)) {
    await writeJsonAtomic(SETTINGS_FILE, withoutBridge(settings, state.previousStatusLine));
  }
  await Promise.all([BRIDGE_SCRIPT, BRIDGE_STATE_FILE, BRIDGE_DATA_FILE].map((f) => rm(f, { force: true })));
}
