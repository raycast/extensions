import { Cache, getFrontmostApplication, getPreferenceValues, PreferenceValues } from "@raycast/api";
import { runAppleScript } from "@raycast/utils";
import { execFile, spawn } from "child_process";
import { existsSync } from "fs";
import { promisify } from "util";
import psl from "psl";

export interface APWEntry {
  domain: string;
  username: string;
  title?: string;
  code?: string;
  hasOtp?: boolean;
  password?: string;
  source?: string;
  sites?: string[];
  highLevelDomain?: string;
}

export interface APWIndexEntry {
  domain: string;
  username: string;
  title?: string;
  sites?: string[];
  hasOtp: boolean;
  hits?: number;
}

export interface APWMsg {
  error?: string;
  status: number;
  results?: APWEntry[];
}

class BrowserError extends Error {
  constructor(browser: string) {
    super(`Browser not supported: ${browser}`);
  }
}

export const PREFERENCES = getPreferenceValues<PreferenceValues>();
const CLI_PATH = PREFERENCES.cliPathAPW || ["/opt/homebrew/bin/apw", "/usr/local/bin/apw"].find(existsSync) || "apw";
const CACHE_TIMEOUT = 1000 * 60 * parseInt(PREFERENCES.cacheTimeout || "0", 10);
const passwordCache = new Map<string, { password: string; expiresAt: number }>();

const indexCache = new Cache({ namespace: "index" });
const INDEX_KEY = "entries";

function readIndex(): APWIndexEntry[] {
  try {
    const raw = indexCache.get(INDEX_KEY);
    return raw ? (JSON.parse(raw) as APWIndexEntry[]) : [];
  } catch {
    return [];
  }
}

function relationshipRank(candidate: string, query: string): number {
  if (candidate === query) return 0;
  if (candidate.endsWith("." + query)) return 1;
  if (query.endsWith("." + candidate)) return 2;
  if (candidate.split(".").some((l) => l.startsWith(query))) return 3;
  if (candidate.includes(query)) return 4;
  return 5;
}

function mergeToIndex(entries: APWIndexEntry[]): void {
  const byKey = new Map<string, APWIndexEntry>();
  for (const e of [...readIndex(), ...entries]) {
    const key = `${(e.username || "").toLowerCase()}\n${(e.domain || "").toLowerCase()}`;
    const saved = byKey.get(key);
    if (saved) {
      saved.sites = [...new Set([...(saved.sites || []), ...(e.sites || [])])];
      saved.hasOtp = saved.hasOtp || e.hasOtp;
    } else {
      byKey.set(key, { ...e });
    }
  }
  indexCache.set(INDEX_KEY, JSON.stringify([...byKey.values()]));
}

export function incrementHits(domain: string, username: string): void {
  const key = `${username.toLowerCase()}\n${domain.toLowerCase()}`;
  const updated = readIndex().map((e) =>
    `${(e.username || "").toLowerCase()}\n${(e.domain || "").toLowerCase()}` === key
      ? { ...e, hits: (e.hits || 0) + 1 }
      : e,
  );
  indexCache.set(INDEX_KEY, JSON.stringify(updated));
}

export function searchIndex(query: string): APWIndexEntry[] {
  const q = query.toLowerCase();
  return readIndex()
    .filter(
      (e) =>
        e.domain.toLowerCase().includes(q) ||
        (e.title || "").toLowerCase().includes(q) ||
        (e.username || "").toLowerCase().includes(q) ||
        (e.sites || []).some((s) => s.toLowerCase().includes(q)),
    )
    .sort((a, b) => {
      const rankDiff = relationshipRank(a.domain, q) - relationshipRank(b.domain, q);
      if (rankDiff !== 0) return rankDiff;
      const hitsDiff = (b.hits || 0) - (a.hits || 0);
      return hitsDiff || a.domain.localeCompare(b.domain);
    });
}
const execFileAsync = promisify(execFile);

function execWithStdin(args: string[], input: string): Promise<APWMsg> {
  return new Promise((resolve, reject) => {
    const child = spawn(CLI_PATH, args);
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (d: Buffer) => (stdout += d));
    child.stderr.on("data", (d: Buffer) => (stderr += d));
    child.on("close", () => {
      const raw = stdout.trim() || stderr.trim();
      try {
        resolve(JSON.parse(raw));
      } catch {
        reject(new Error(raw || "Unknown error"));
      }
    });
    child.stdin.write(input + "\n");
    child.stdin.end();
  });
}

export async function execAPWCommand(args: string[], stdin?: string): Promise<APWMsg> {
  const shouldCache = args[0] === "pw" && args[1] === "get" && args.length === 4 && CACHE_TIMEOUT > 0;
  const cacheKey = shouldCache ? `pw\0${args[2]}\0${args[3]}` : "";

  if (shouldCache) {
    const entry = passwordCache.get(cacheKey);
    if (entry && Date.now() < entry.expiresAt) {
      console.info("Cache hit: pw get");
      return { status: 0, results: [{ domain: args[2], username: args[3], password: entry.password }] };
    }
    if (entry) passwordCache.delete(cacheKey);
  }

  if (stdin !== undefined) return execWithStdin(args, stdin);

  try {
    const { stdout } = await execFileAsync(CLI_PATH, args);
    const data = JSON.parse(stdout.trim()) as APWMsg;
    const password = data.results?.[0]?.password;
    if (data.status === 0 && shouldCache && password !== undefined) {
      passwordCache.set(cacheKey, { password, expiresAt: Date.now() + CACHE_TIMEOUT });
    }
    return data;
  } catch (error) {
    const stderr = error && typeof error === "object" && "stderr" in error ? String(error.stderr).trim() : "";
    if (!stderr) throw error;
    let message = stderr;
    let apwStatus: number | undefined;
    try {
      const parsed = JSON.parse(stderr) as APWMsg;
      message = parsed.error || stderr;
      apwStatus = parsed.status;
    } catch {
      /* not JSON */
    }
    throw Object.assign(new Error(message), { apwStatus });
  }
}

function parseDomain(url: string): string {
  const parsed = psl.parse(url);
  if ("error" in parsed || !parsed.domain) return url;
  return parsed.domain;
}

function mergeEntries(passwordList: APWEntry[], otpList: APWEntry[]): APWEntry[] {
  return passwordList.map((entry) => {
    const otpEntry = otpList.find(
      (otp) => parseDomain(otp.domain) === parseDomain(entry.domain) && otp.username === entry.username,
    );
    return {
      ...entry,
      domain: parseDomain(entry.domain),
      code: otpEntry?.code,
      hasOtp: !!otpEntry,
    };
  });
}

export async function listAPWEntries(url: string): Promise<APWEntry[]> {
  const [passwordList, otpList] = await Promise.all([
    execAPWCommand(["pw", "list", url]),
    execAPWCommand(["otp", "list", url]),
  ]);
  const merged = mergeEntries(passwordList.results ?? [], otpList.results ?? []);
  mergeToIndex(
    merged.map((e) => ({ domain: e.domain, username: e.username, title: e.title, sites: e.sites, hasOtp: !!e.hasOtp })),
  );
  return merged;
}

export async function getAPWEntry(url: string, action: "otp" | "pw", username: string): Promise<APWEntry | undefined> {
  const result = await execAPWCommand(action === "pw" ? [action, "get", url, username] : [action, "get", url]);
  if (action === "pw") {
    const password = result.results?.[0]?.password;
    return password === undefined ? undefined : { domain: parseDomain(url), username, password };
  }
  return (result.results ?? [])
    .map((entry) => ({ ...entry, domain: parseDomain(entry.domain) }))
    .find((entry) => entry.username === username && entry.domain === parseDomain(url));
}

const getBrowserCommand = (browserName: string) => {
  switch (browserName) {
    case "Safari":
    case "Webkit":
    case "Orion":
      return `tell application "${browserName}" to return URL of front document`;
    case "Google Chrome":
    case "Google Chrome Canary":
    case "Chromium":
    case "Brave":
    case "Arc":
      return `tell application "${browserName}" to return URL of active tab of front window`;
    default:
      throw new BrowserError(browserName);
  }
};

export const getActiveURL = async (): Promise<string> => {
  try {
    const frontmostApplication = await getFrontmostApplication();
    try {
      const res = await runAppleScript(getBrowserCommand(frontmostApplication.name));
      const parsed = psl.parse(new URL(res).hostname);
      if ("error" in parsed) {
        throw new Error(parsed.error.toString());
      }
      return parsed.domain || "";
    } catch (error) {
      if (error instanceof BrowserError) {
        console.warn(error.message);
        return "";
      }
      console.error("Application: " + frontmostApplication.name, error);
      return "";
    }
  } catch {
    return "";
  }
};
