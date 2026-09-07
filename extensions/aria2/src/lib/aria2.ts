import { environment, getPreferenceValues } from "@raycast/api";
import { execFileSync, spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdir, readFile, rm } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import { toNumber } from "./format";
import { writeHandlerConfig } from "./magnet-handler";

const STATUS_KEYS = [
  "gid",
  "status",
  "totalLength",
  "completedLength",
  "uploadLength",
  "downloadSpeed",
  "uploadSpeed",
  "connections",
  "numSeeders",
  "seeder",
  "files",
  "bittorrent",
  "dir",
  "errorMessage",
  "infoHash",
  "followedBy",
] as const;

export type TorrentGroup = "downloading" | "seeding" | "queued" | "paused" | "complete" | "error";

export interface Aria2File {
  path?: string;
  length?: string;
  completedLength?: string;
  selected?: string;
  uris?: { uri: string; status: string }[];
}

export interface Aria2Download {
  gid: string;
  status: "active" | "waiting" | "paused" | "error" | "complete" | "removed";
  totalLength: string;
  completedLength: string;
  uploadLength: string;
  downloadSpeed: string;
  uploadSpeed: string;
  connections?: string;
  numSeeders?: string;
  seeder?: string;
  files?: Aria2File[];
  bittorrent?: {
    info?: { name?: string };
    mode?: string;
    announceList?: string[][];
  };
  dir?: string;
  errorMessage?: string;
  infoHash?: string;
  followedBy?: string[];
}

export type AddInput = { kind: "uri"; uri: string } | { kind: "torrent"; path: string };

export class Aria2Error extends Error {
  constructor(
    message: string,
    readonly causeName?: string,
  ) {
    super(message);
    this.name = "Aria2Error";
  }
}

export function prefs(): Preferences {
  return getPreferenceValues<Preferences>();
}

export function downloadDir(): string {
  const dir = prefs().downloadDir?.trim();
  return dir || join(homedir(), "Downloads");
}

export function rpcUrl(): string {
  const host = prefs().rpcHost?.trim() || "127.0.0.1";
  const port = prefs().rpcPort?.trim() || "6800";
  return `http://${host}:${port}/jsonrpc`;
}

function handlerConfig() {
  return { rpcUrl: rpcUrl(), rpcSecret: prefs().rpcSecret?.trim() || "", downloadDir: downloadDir() };
}

function tokenParam(): string | undefined {
  const secret = prefs().rpcSecret?.trim();
  return secret ? `token:${secret}` : undefined;
}

async function rpc<T>(method: string, params: unknown[] = []): Promise<T> {
  const token = tokenParam();
  const body = {
    jsonrpc: "2.0",
    id: `${method}-${Date.now()}`,
    method,
    params: token ? [token, ...params] : params,
  };

  let response: Response;
  try {
    response = await fetch(rpcUrl(), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(8000),
    });
  } catch (error) {
    const err = error as Error;
    throw new Aria2Error(connectionMessage(err), err.name);
  }

  const payload = (await response.json()) as { result?: T; error?: { message?: string; code?: number } };
  if (!response.ok) {
    throw new Aria2Error(`aria2 RPC HTTP ${response.status}`);
  }
  if (payload.error) {
    throw new Aria2Error(payload.error.message || `aria2 error ${payload.error.code ?? ""}`.trim());
  }
  return payload.result as T;
}

function connectionMessage(error: Error): string {
  const text = `${error.name} ${error.message}`.toLowerCase();
  if (text.includes("abort") || text.includes("timeout")) {
    return `Timed out reaching aria2 at ${rpcUrl()}`;
  }
  return `Can't reach aria2 at ${rpcUrl()}. Start aria2c with --enable-rpc, or enable auto-start in preferences.`;
}

export function isConnectionError(error: unknown): boolean {
  if (!(error instanceof Aria2Error)) return false;
  return (
    error.causeName === "TimeoutError" ||
    error.causeName === "AbortError" ||
    error.message.startsWith("Can't reach") ||
    error.message.startsWith("Timed out")
  );
}

export async function ping(): Promise<void> {
  await rpc("aria2.getVersion");
}

export async function ensureAria2(): Promise<void> {
  try {
    await ping();
    await writeHandlerConfig(handlerConfig()).catch(() => undefined);
    return;
  } catch (error) {
    if (!prefs().autoStart || !isConnectionError(error)) throw error;
  }

  await startDaemon();
  await waitForRpc();
  await writeHandlerConfig(handlerConfig()).catch(() => undefined);
}

async function waitForRpc(): Promise<void> {
  let lastError: unknown;
  for (let i = 0; i < 20; i++) {
    try {
      await ping();
      return;
    } catch (error) {
      lastError = error;
      await sleep(250);
    }
  }
  throw lastError instanceof Error ? lastError : new Aria2Error("aria2c started but RPC never became ready");
}

export async function startDaemon(): Promise<void> {
  const binary = resolveAria2Path();
  if (!binary) {
    throw new Aria2Error("aria2c not found. Install it with `brew install aria2` or set aria2c Path in preferences.");
  }

  const dir = downloadDir();
  await mkdir(dir, { recursive: true });
  await mkdir(environment.supportPath, { recursive: true });

  const session = join(environment.supportPath, "session.txt");
  const args = [
    "--enable-rpc=true",
    "--rpc-listen-all=false",
    `--rpc-listen-port=${prefs().rpcPort?.trim() || "6800"}`,
    `--dir=${dir}`,
    "--continue=true",
    "--enable-dht=true",
    "--bt-enable-lpd=true",
    "--bt-save-metadata=true",
    `--seed-ratio=${prefs().seedRatio?.trim() || "1.0"}`,
    `--save-session=${session}`,
    "--save-session-interval=30",
    "--daemon=true",
  ];

  const secret = prefs().rpcSecret?.trim();
  if (secret) args.push(`--rpc-secret=${secret}`);
  if (existsSync(session)) args.push(`--input-file=${session}`);

  const child = spawn(binary, args, {
    detached: true,
    stdio: "ignore",
    env: { ...process.env, PATH: process.env.PATH || "/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin" },
  });
  child.unref();
}

function resolveAria2Path(): string | undefined {
  const custom = prefs().aria2Path?.trim();
  const candidates = [
    custom,
    "/opt/homebrew/bin/aria2c",
    "/usr/local/bin/aria2c",
    "/opt/local/bin/aria2c",
    "/usr/bin/aria2c",
  ].filter((path): path is string => Boolean(path));

  for (const candidate of candidates) {
    if (existsSync(candidate)) return candidate;
  }

  try {
    const found = execFileSync("which", ["aria2c"], {
      encoding: "utf8",
      env: { ...process.env, PATH: `${process.env.PATH || ""}:/opt/homebrew/bin:/usr/local/bin` },
    }).trim();
    return found || undefined;
  } catch {
    return undefined;
  }
}

export function parseSource(text: string | undefined): AddInput | undefined {
  if (!text) return;
  const value = text.trim().replace(/^['"]|['"]$/g, "");
  if (!value) return;
  if (value.toLowerCase().startsWith("magnet:") || /^https?:\/\//i.test(value)) {
    return { kind: "uri", uri: value };
  }
  if (value.endsWith(".torrent") || existsSync(value)) {
    return { kind: "torrent", path: value };
  }
}

export async function addSource(input: AddInput, dir?: string): Promise<string> {
  const options: Record<string, string> = { dir: dir || downloadDir() };
  if (input.kind === "uri") {
    return rpc<string>("aria2.addUri", [[input.uri], options]);
  }
  const buffer = await readFile(input.path);
  return rpc<string>("aria2.addTorrent", [buffer.toString("base64"), [], options]);
}

export async function listDownloads(): Promise<Aria2Download[]> {
  const [active, waiting, stopped] = await Promise.all([
    rpc<Aria2Download[]>("aria2.tellActive", [STATUS_KEYS]),
    rpc<Aria2Download[]>("aria2.tellWaiting", [0, 1000, STATUS_KEYS]),
    rpc<Aria2Download[]>("aria2.tellStopped", [0, 1000, STATUS_KEYS]),
  ]);

  const seen = new Set<string>();
  const downloads: Aria2Download[] = [];
  for (const item of [...active, ...waiting, ...stopped]) {
    if (!item?.gid || seen.has(item.gid) || item.status === "removed") continue;
    if (item.followedBy && item.followedBy.length > 0) continue;
    seen.add(item.gid);
    downloads.push(item);
  }
  return downloads;
}

export async function pause(gid: string): Promise<void> {
  await rpc("aria2.pause", [gid]);
}

export async function resume(gid: string): Promise<void> {
  await rpc("aria2.unpause", [gid]);
}

export async function pauseAll(): Promise<void> {
  await rpc("aria2.pauseAll");
}

export async function resumeAll(): Promise<void> {
  await rpc("aria2.unpauseAll");
}

export async function removeTorrent(gid: string, deleteFiles: boolean, download?: Aria2Download): Promise<void> {
  const files = deleteFiles ? filePaths(download) : [];
  try {
    await rpc("aria2.forceRemove", [gid]);
  } catch {
    // already gone from the active queue
  }
  try {
    await rpc("aria2.removeDownloadResult", [gid]);
  } catch {
    // not in the result list
  }
  if (!deleteFiles) return;

  for (const filePath of files) {
    await rm(filePath, { force: true, recursive: true }).catch(() => undefined);
    await rm(`${filePath}.aria2`, { force: true }).catch(() => undefined);
  }
}

export async function purgeCompleted(): Promise<void> {
  await rpc("aria2.purgeDownloadResult");
}

export function torrentName(download: Aria2Download): string {
  const name = download.bittorrent?.info?.name;
  if (name) return name;
  const path = download.files?.find((file) => file.path)?.path;
  if (path) {
    const base = path.split("/").pop();
    if (base && base !== "[METADATA]") return base;
  }
  if (download.infoHash) return download.infoHash.slice(0, 16);
  return download.gid;
}

export function isFinished(download: Aria2Download): boolean {
  const total = toNumber(download.totalLength);
  const done = toNumber(download.completedLength);
  return total > 0 && done >= total;
}

export function classify(download: Aria2Download): TorrentGroup {
  if (download.status === "error") return "error";
  if (download.status === "paused") return "paused";
  if (download.status === "waiting") return "queued";
  if (download.status === "complete") return "complete";
  if (download.status === "active" && (download.seeder === "true" || isFinished(download))) return "seeding";
  if (download.status === "active") return "downloading";
  return "complete";
}

export function magnetUri(download: Aria2Download): string | undefined {
  const fromFile = download.files?.flatMap((file) => file.uris ?? []).find((uri) => uri.uri.startsWith("magnet:"));
  if (fromFile) return fromFile.uri;
  if (download.infoHash) return `magnet:?xt=urn:btih:${download.infoHash}`;
}

export function filePaths(download?: Aria2Download): string[] {
  if (!download?.files) return [];
  return download.files
    .map((file) => file.path)
    .filter((path): path is string => Boolean(path && path !== "[METADATA]"));
}

export function revealPath(download: Aria2Download): string | undefined {
  const files = filePaths(download);
  if (files[0] && existsSync(files[0])) return files[0];
  if (download.dir && existsSync(download.dir)) return download.dir;
  return files[0] || download.dir;
}

function sleep(ms: number): Promise<void> {
  const { promise, resolve } = Promise.withResolvers<void>();
  setTimeout(resolve, ms);
  return promise;
}
