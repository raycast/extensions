/**
 * Client for SnipperApp's bundled `snipper-mcp` helper.
 *
 * The helper is an MCP server (newline-delimited JSON-RPC over stdio) that ships inside
 * `SnipperApp 3.app/Contents/MacOS/snipper-mcp`. Because it carries the app-group
 * entitlement, it reads/writes the local library on our behalf — so the extension needs
 * NO Full Disk Access. Protocol validated against the installed App Store build.
 */
import { getApplications, getPreferenceValues } from "@raycast/api";
import { spawn, type ChildProcessWithoutNullStreams } from "child_process";
import { accessSync, constants } from "fs";
import { join } from "path";
import {
  projectSnippet,
  type Folder,
  type Language,
  type RawSnippet,
  type Snippet,
  type Storage,
  type Tag,
  type Workspace,
} from "./types";

const BUNDLE_IDS = ["com.oloapps.Snipper3.AppStore", "com.oloapps.Snipper3", "com.oloapps.Snipper3.Setapp"];
const HELPER_RELPATH = "Contents/MacOS/snipper-mcp";

export class HelperNotFoundError extends Error {
  constructor(message = "SnipperApp is not installed.") {
    super(message);
    this.name = "HelperNotFoundError";
  }
}

/** True if an error means SnipperApp/the helper couldn't be located. */
export function isHelperNotFound(error: unknown): boolean {
  if (error instanceof HelperNotFoundError) return true;
  if (error instanceof Error)
    return error.name === "HelperNotFoundError" || /not installed|not found or not executable/i.test(error.message);
  return false;
}

interface Pending {
  resolve: (value: unknown) => void;
  reject: (error: Error) => void;
}

class SnipperHelper {
  private child: ChildProcessWithoutNullStreams | null = null;
  private buffer = "";
  private nextId = 1;
  private readonly pending = new Map<number, Pending>();
  private ready: Promise<void> | null = null;
  private queue: Promise<unknown> = Promise.resolve();

  constructor(private readonly binPath: string) {}

  private ensureStarted(): Promise<void> {
    if (this.ready) return this.ready;
    this.ready = new Promise<void>((resolve, reject) => {
      try {
        const child = spawn(this.binPath, [], { stdio: ["pipe", "pipe", "pipe"] });
        this.child = child;
        child.stdout.setEncoding("utf8");
        child.stdout.on("data", (chunk: string) => this.onData(chunk));
        child.on("error", (error) => this.failAll(error));
        child.on("exit", (code) => this.failAll(new Error(`snipper-mcp exited (code ${code ?? "?"})`)));

        this.request("initialize", {
          protocolVersion: "2024-11-05",
          capabilities: {},
          clientInfo: { name: "raycast-snipperapp", version: "1.0.0" },
        })
          .then(() => {
            this.notify("notifications/initialized");
            resolve();
          })
          .catch(reject);
      } catch (error) {
        reject(error as Error);
      }
    });
    return this.ready;
  }

  private onData(chunk: string) {
    this.buffer += chunk;
    let index: number;
    while ((index = this.buffer.indexOf("\n")) >= 0) {
      const line = this.buffer.slice(0, index).trim();
      this.buffer = this.buffer.slice(index + 1);
      if (!line) continue;
      let message: { id?: number; result?: unknown; error?: { message?: string } };
      try {
        message = JSON.parse(line);
      } catch {
        continue;
      }
      if (typeof message.id === "number" && this.pending.has(message.id)) {
        const pending = this.pending.get(message.id)!;
        this.pending.delete(message.id);
        if (message.error) pending.reject(new Error(message.error.message ?? "RPC error"));
        else pending.resolve(message.result);
      }
    }
  }

  private failAll(error: Error) {
    for (const pending of this.pending.values()) pending.reject(error);
    this.pending.clear();
    this.child = null;
    this.ready = null;
  }

  private write(payload: unknown) {
    if (!this.child) throw new Error("snipper-mcp is not running");
    this.child.stdin.write(JSON.stringify(payload) + "\n");
  }

  private notify(method: string, params?: unknown) {
    this.write({ jsonrpc: "2.0", method, params });
  }

  private request(method: string, params?: unknown, timeoutMs = 15000): Promise<unknown> {
    const id = this.nextId++;
    return new Promise<unknown>((resolve, reject) => {
      const timer = setTimeout(() => {
        if (this.pending.has(id)) {
          this.pending.delete(id);
          reject(new Error(`${method} timed out`));
        }
      }, timeoutMs);
      this.pending.set(id, {
        resolve: (value) => {
          clearTimeout(timer);
          resolve(value);
        },
        reject: (error) => {
          clearTimeout(timer);
          reject(error);
        },
      });
      try {
        this.write({ jsonrpc: "2.0", id, method, params });
      } catch (error) {
        clearTimeout(timer);
        this.pending.delete(id);
        reject(error as Error);
      }
    });
  }

  /** Call a tool. Returns the parsed JSON of `result.content[0].text`, or the raw text. */
  async callTool<T>(name: string, args: Record<string, unknown> = {}): Promise<T> {
    await this.ensureStarted();
    const run = async (): Promise<T> => {
      const result = (await this.request("tools/call", { name, arguments: args })) as {
        isError?: boolean;
        content?: Array<{ type?: string; text?: string }>;
      };
      const text = result?.content?.[0]?.text;
      if (result?.isError) throw new Error(text ?? `${name} failed`);
      if (text == null) return undefined as unknown as T;
      try {
        return JSON.parse(text) as T;
      } catch {
        return text as unknown as T;
      }
    };
    // Serialize tool calls over the single stdio pipe; keep the chain alive on failures.
    const next = this.queue.then(run, run) as Promise<T>;
    this.queue = next.catch(() => undefined);
    return next;
  }

  dispose() {
    if (this.child) {
      try {
        this.child.stdin.end();
        this.child.kill();
      } catch {
        // ignore
      }
    }
    this.failAll(new Error("helper disposed"));
  }
}

let cached: SnipperHelper | null = null;
let cachedPath: string | null = null;

async function resolveHelperPath(): Promise<string> {
  const override = getPreferenceValues<Preferences>().helperPath?.trim();
  if (override) return override;
  const apps = await getApplications();
  const app = apps.find((a) => a.bundleId != null && BUNDLE_IDS.includes(a.bundleId));
  if (!app) throw new HelperNotFoundError();
  return join(app.path, HELPER_RELPATH);
}

/** Resolve, validate, and return the shared helper client (spawned lazily on first tool call). */
export async function getHelper(): Promise<SnipperHelper> {
  if (cached) return cached;
  const binPath = cachedPath ?? (cachedPath = await resolveHelperPath());
  try {
    accessSync(binPath, constants.X_OK);
  } catch {
    throw new HelperNotFoundError(`snipper-mcp not found or not executable at ${binPath}`);
  }
  cached = new SnipperHelper(binPath);
  return cached;
}

/** Dispose the shared helper (call from a command's unmount cleanup). */
export function disposeHelper() {
  cached?.dispose();
  cached = null;
  cachedPath = null; // re-resolve on next use so an updated helperPath preference is picked up
}

function clean(params: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(Object.entries(params).filter(([, value]) => value !== undefined && value !== ""));
}

// ---- Typed tool wrappers ----------------------------------------------------

export async function searchSnippets(params: {
  query?: string;
  language?: string;
  favorite?: boolean;
  limit?: number;
}): Promise<Snippet[]> {
  const helper = await getHelper();
  const raw = await helper.callTool<RawSnippet[]>("search_snippets", clean({ limit: 100, ...params }));
  return (raw ?? []).map(projectSnippet);
}

export async function getSnippet(id: string): Promise<Snippet | null> {
  const helper = await getHelper();
  const raw = await helper.callTool<RawSnippet | null>("get_snippet", { id });
  return raw ? projectSnippet(raw) : null;
}

export async function createSnippet(params: {
  title: string;
  content: string;
  language?: string;
  folder_id?: string;
  workspace_id?: string;
}): Promise<string> {
  const helper = await getHelper();
  const result = await helper.callTool<unknown>("create_snippet", clean(params));
  return typeof result === "string" ? result : "Snippet created";
}

export async function setFavorite(id: string, isFavorite: boolean): Promise<void> {
  const helper = await getHelper();
  await helper.callTool("update_snippet", { id, is_favorite: isFavorite });
}

export async function listWorkspaces(): Promise<Workspace[]> {
  const helper = await getHelper();
  return (await helper.callTool<Workspace[]>("list_workspaces")) ?? [];
}

export async function listStorages(): Promise<Storage[]> {
  const helper = await getHelper();
  return (await helper.callTool<Storage[]>("list_storages")) ?? [];
}

export async function listFolders(): Promise<Folder[]> {
  const helper = await getHelper();
  return (await helper.callTool<Folder[]>("list_folders")) ?? [];
}

export async function listTags(): Promise<Tag[]> {
  const helper = await getHelper();
  return (await helper.callTool<Tag[]>("list_tags")) ?? [];
}

export async function listLanguages(): Promise<Language[]> {
  const helper = await getHelper();
  return (await helper.callTool<Language[]>("list_languages")) ?? [];
}
