import { Cache, getPreferenceValues } from "@raycast/api";
import { execFile, execFileSync, spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

export const STORE_URL = "https://mactoolbox.app/?utm_source=raycast&utm_medium=extension";

/** A tool as Toolbox's MCP server describes it (the same list the `toolbox` command uses). */
export interface Tool {
  name: string; // snake_case, e.g. compress_video
  title: string;
  description: string;
  inputSchema: {
    properties: Record<string, Property>;
    required?: string[];
  };
}

export interface Property {
  type: "string" | "boolean" | "integer" | "number" | "array";
  description?: string;
  enum?: string[];
  default?: string | number | boolean;
  minimum?: number;
  maximum?: number;
}

export interface Output {
  path: string;
  size_bytes?: number;
  source?: string;
  source_size_bytes?: number;
}

export interface RunResult {
  folder?: string;
  outputs: Output[];
  text?: string;
  reports?: unknown[];
}

export type Values = Record<string, string | number | boolean | string[] | undefined>;

/** An error from Toolbox meant for the user, plus what kind it is so we can offer the right action. */
export class ToolboxError extends Error {
  constructor(
    message: string,
    readonly kind: "missing" | "update" | "license" | "dependency" | "tool" = "tool",
  ) {
    super(message);
  }
}

/** Where Toolbox.app is: the app chosen in the preferences, else /Applications. */
export function appPath(): string {
  const { toolboxApp } = getPreferenceValues<Preferences>();
  return (toolboxApp?.path || "/Applications/Toolbox.app").replace(/\/$/, "");
}

/** The Toolbox executable, or a "missing" error that tells the user where to get it. */
export function binary(): string {
  const bin = `${appPath()}/Contents/MacOS/Toolbox`;
  if (!existsSync(bin)) {
    throw new ToolboxError("Toolbox isn't installed. Get it at mactoolbox.app, then try again.", "missing");
  }
  // Toolbox 1.x has no command line: running it with arguments would just open its window.
  const version = shortVersion();
  if (version && Number(version.split(".")[0]) < 2) {
    throw new ToolboxError(
      `Raycast needs Toolbox 2.0 or later (you have ${version}). Open Toolbox and choose Check for Updates. It's free.`,
      "update",
    );
  }
  return bin;
}

let knownVersion: string | undefined;
function shortVersion(): string | undefined {
  if (knownVersion === undefined) {
    try {
      knownVersion = execFileSync("defaults", ["read", `${appPath()}/Contents/Info`, "CFBundleShortVersionString"])
        .toString()
        .trim();
    } catch {
      knownVersion = "";
    }
  }
  return knownVersion || undefined;
}

/** The tools turned off in Toolbox › Settings › Agents also disappear from the tool list, so they're part of the cache key. */
async function disabledTools(): Promise<string> {
  try {
    const { stdout } = await execFileAsync("defaults", ["read", "com.nklm.Toolbox", "agents.disabledTools"]);
    return stdout.replace(/\s+/g, "");
  } catch {
    return "";
  }
}

async function appVersion(): Promise<string> {
  try {
    const { stdout } = await execFileAsync("defaults", ["read", `${appPath()}/Contents/Info`, "CFBundleVersion"]);
    return stdout.trim();
  } catch {
    return "unknown";
  }
}

const cache = new Cache();

/** Every tool with its options, read from the installed Toolbox (cached per Toolbox build). */
export async function listTools(): Promise<Tool[]> {
  const key = `tools-v2-${appPath()}-${await appVersion()}-${await disabledTools()}`;
  const cached = cache.get(key);
  if (cached) return JSON.parse(cached) as Tool[];
  const tools = (await mcpToolsList())
    .filter((t) => t.name !== "toolbox_status")
    .map((t) => ({ ...t, description: forPeople(t.description) }));
  cache.set(key, JSON.stringify(tools));
  return tools;
}

/** Drops the hints meant for AI apps, like "Needs FFmpeg (see toolbox_status)." */
function forPeople(description: string): string {
  return description
    .split(/(?<=\.)\s+/)
    .filter((sentence) => !/toolbox_status|the agent/i.test(sentence))
    .join(" ")
    .replace(/\bthe user has\b/gi, "you have")
    .replace(/\bthe user's\b/gi, "your")
    .replace(/\bthe user\b/gi, "you");
}

/** Asks `Toolbox mcp` for its tool list over stdio (JSON-RPC, one message per line). */
async function mcpToolsList(): Promise<Tool[]> {
  const bin = binary();
  return new Promise((resolve, reject) => {
    const child = spawn(bin, ["mcp"], { stdio: ["pipe", "pipe", "ignore"] });
    let buffer = "";
    const timer = setTimeout(() => {
      child.kill();
      reject(new ToolboxError("Toolbox didn't answer. Open Toolbox once, then try again."));
    }, 20000);
    const send = (message: object) => child.stdin.write(JSON.stringify({ jsonrpc: "2.0", ...message }) + "\n");
    child.stdout.on("data", (chunk) => {
      buffer += chunk;
      let newline: number;
      while ((newline = buffer.indexOf("\n")) >= 0) {
        const line = buffer.slice(0, newline);
        buffer = buffer.slice(newline + 1);
        let message: { id?: number; result?: { tools?: Tool[] }; error?: { message: string } };
        try {
          message = JSON.parse(line);
        } catch {
          continue;
        }
        if (message.id === 1) {
          send({ method: "notifications/initialized" });
          send({ id: 2, method: "tools/list", params: {} });
        } else if (message.id === 2) {
          clearTimeout(timer);
          child.kill();
          if (message.result?.tools) resolve(message.result.tools);
          else reject(new ToolboxError(message.error?.message ?? "Toolbox couldn't list its tools."));
        }
      }
    });
    child.on("error", (error) => {
      clearTimeout(timer);
      reject(new ToolboxError(error.message));
    });
    send({
      id: 1,
      method: "initialize",
      params: {
        protocolVersion: "2025-06-18",
        capabilities: {},
        clientInfo: { name: "raycast-toolbox", version: "1.0" },
      },
    });
  });
}

/** compress_video → compress-video (the command-line name). */
export const cliName = (tool: string) => tool.replace(/_/g, "-");

/** Turns form values into `toolbox` arguments: files/urls first, then --option value pairs. */
export function buildArgs(tool: Tool, values: Values): string[] {
  const props = tool.inputSchema.properties;
  const args: string[] = [];
  const positional = props.files ? "files" : props.urls ? "urls" : undefined;
  if (positional) args.push(...((values[positional] as string[] | undefined) ?? []));
  for (const [key, prop] of Object.entries(props)) {
    if (key === positional) continue;
    const value = values[key];
    if (value === undefined || value === "" || (Array.isArray(value) && value.length === 0)) continue;
    const flag = `--${key.replace(/_/g, "-")}`;
    if (prop.type === "boolean") {
      if (value !== prop.default) args.push(value ? flag : `--no-${key.replace(/_/g, "-")}`);
    } else if (Array.isArray(value)) {
      for (const item of value) args.push(flag, item);
    } else {
      args.push(flag, String(value));
    }
  }
  return args;
}

/** Runs `toolbox <tool> …args --json` and returns its parsed result. Stops Toolbox if `signal` aborts. */
export async function run(tool: string, args: string[], signal?: AbortSignal): Promise<RunResult> {
  const bin = binary(); // async, so a missing or outdated Toolbox rejects instead of throwing
  return new Promise((resolve, reject) => {
    const child = spawn(bin, ["cli", cliName(tool), ...args, "--json"], { stdio: ["ignore", "pipe", "pipe"] });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => (stdout += chunk));
    child.stderr.on("data", (chunk) => (stderr += chunk));
    const abort = () => child.kill("SIGTERM");
    signal?.addEventListener("abort", abort);
    child.on("error", (error) => reject(new ToolboxError(error.message)));
    child.on("close", (code) => {
      signal?.removeEventListener("abort", abort);
      if (signal?.aborted) return reject(new ToolboxError("Stopped."));
      let parsed: (RunResult & { error?: string }) | undefined;
      try {
        parsed = JSON.parse(stdout);
      } catch {
        parsed = undefined;
      }
      if (code === 0 && parsed && !parsed.error) return resolve({ ...parsed, outputs: parsed.outputs ?? [] });
      const message = parsed?.error || stderr.trim() || stdout.trim() || `Toolbox stopped (code ${code}).`;
      reject(new ToolboxError(message, classify(message)));
    });
  });
}

function classify(message: string): ToolboxError["kind"] {
  if (/licen[cs]e|activate|trial|purchase|buy/i.test(message)) return "license";
  if (/ffmpeg|yt-dlp/i.test(message)) return "dependency";
  return "tool";
}

export function formatBytes(bytes?: number): string {
  if (bytes === undefined) return "";
  const units = ["B", "KB", "MB", "GB"];
  let value = bytes;
  let unit = 0;
  while (value >= 1000 && unit < units.length - 1) {
    value /= 1000;
    unit++;
  }
  return `${value.toFixed(value < 10 && unit > 0 ? 1 : 0)} ${units[unit]}`;
}

/** "3 files · 1.4 GB → 186 MB (−87%)", or just the count when sizes are unknown. */
export function summarize(result: RunResult): string {
  const outs = result.outputs;
  const count = `${outs.length} file${outs.length === 1 ? "" : "s"}`;
  const before = outs.reduce((sum, o) => sum + (o.source_size_bytes ?? 0), 0);
  const after = outs.reduce((sum, o) => sum + (o.size_bytes ?? 0), 0);
  if (!before || !after || outs.some((o) => o.source_size_bytes === undefined)) return count;
  const change = Math.round((after / before - 1) * 100);
  return `${count} · ${formatBytes(before)} → ${formatBytes(after)} (${change > 0 ? "+" : ""}${change}%)`;
}
