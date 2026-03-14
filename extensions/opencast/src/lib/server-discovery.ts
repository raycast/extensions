import { LocalStorage } from "@raycast/api";
import { execFile } from "node:child_process";
import { readFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { getPreferences } from "./preferences";

const execFileAsync = promisify(execFile);
const DISCOVERED_SERVERS_KEY = "discovered-server-urls";
const COMMON_PORTS = [3001, 4096, 3000];
const TAURI_IDS = [
  "ai.opencode.desktop.dev",
  "ai.opencode.desktop.beta",
  "ai.opencode.desktop",
];

function normalizeUrl(raw: string): string | undefined {
  const value = raw.trim();
  if (!value) {
    return undefined;
  }
  try {
    return new URL(value).origin;
  } catch {
    return undefined;
  }
}

async function readJson<T>(filePath: string): Promise<T | undefined> {
  try {
    const raw = await readFile(filePath, "utf-8");
    return JSON.parse(raw) as T;
  } catch {
    return undefined;
  }
}

async function readStoredDefaultUrls(): Promise<string[]> {
  const supportDir = path.join(os.homedir(), "Library", "Application Support");
  const urls = new Set<string>();
  for (const appId of TAURI_IDS) {
    const parsed = await readJson<Record<string, unknown>>(
      path.join(supportDir, appId, "opencode.settings.dat"),
    );
    const url =
      typeof parsed?.defaultServerUrl === "string"
        ? normalizeUrl(parsed.defaultServerUrl)
        : undefined;
    if (url) {
      urls.add(url);
    }
  }
  return [...urls];
}

async function readRememberedUrls(): Promise<string[]> {
  const raw = await LocalStorage.getItem<string>(DISCOVERED_SERVERS_KEY);
  if (!raw) {
    return [];
  }
  try {
    const parsed = JSON.parse(raw) as string[];
    return parsed
      .map((item) => normalizeUrl(item))
      .filter((item): item is string => Boolean(item));
  } catch {
    return [];
  }
}

async function saveRememberedUrls(urls: string[]): Promise<void> {
  await LocalStorage.setItem(
    DISCOVERED_SERVERS_KEY,
    JSON.stringify(urls.slice(0, 12)),
  );
}

export function parseListeningUrls(lsofOutput: string): string[] {
  const urls = new Set<string>();
  for (const line of lsofOutput.split("\n")) {
    const match = line.match(
      /(?:127\.0\.0\.1|localhost|\*):(\d+)\s+\(LISTEN\)/,
    );
    if (!match?.[1]) {
      continue;
    }
    urls.add(`http://127.0.0.1:${match[1]}`);
  }
  return [...urls];
}

async function discoverListeningUrls(): Promise<string[]> {
  try {
    const { stdout } = await execFileAsync("lsof", [
      "-nP",
      "-iTCP",
      "-sTCP:LISTEN",
    ]);
    return parseListeningUrls(stdout);
  } catch {
    return [];
  }
}

async function probeServer(url: string): Promise<boolean> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 400);
  try {
    const response = await fetch(`${url}/config`, {
      signal: controller.signal,
    });
    if (!response.ok) {
      return false;
    }
    const data = (await response.json()) as { $schema?: string };
    return data.$schema === "https://opencode.ai/config.json";
  } catch {
    return false;
  } finally {
    clearTimeout(timeout);
  }
}

export async function resolveServerCandidates(): Promise<string[]> {
  const preferences = getPreferences();
  const [remembered, storedDefaults, listening] = await Promise.all([
    readRememberedUrls(),
    readStoredDefaultUrls(),
    discoverListeningUrls(),
  ]);

  return [
    preferences.serverUrl,
    ...remembered,
    ...storedDefaults,
    ...listening,
    ...COMMON_PORTS.map((port) => `http://127.0.0.1:${port}`),
  ]
    .map((item) => normalizeUrl(item ?? ""))
    .filter(
      (item, index, array): item is string =>
        Boolean(item) && array.indexOf(item) === index,
    );
}

export async function resolveServerUrl(): Promise<string | undefined> {
  const candidates = await resolveServerCandidates();
  const healthy: string[] = [];
  for (const candidate of candidates) {
    if (await probeServer(candidate)) {
      healthy.push(candidate);
    }
  }
  if (healthy.length > 0) {
    await saveRememberedUrls(healthy);
  }
  return healthy[0];
}
