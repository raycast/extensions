import { promises as fs } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { asNumber, asRecord, asString } from "./json";
import type { QuotaWindow, ToolQuota } from "./types";

const USAGE_URL = "https://chatgpt.com/backend-api/wham/usage";

function codexBaseDir(override?: string): string {
  const trimmed = override?.trim();
  return trimmed && trimmed.length > 0 ? trimmed : join(homedir(), ".codex");
}

/** Walk `sessionsDir` recursively and return the most recently modified `rollout-*.jsonl`. */
async function findNewestRollout(sessionsDir: string): Promise<string | undefined> {
  let newest: { path: string; mtimeMs: number } | undefined;

  async function walk(dir: string): Promise<void> {
    let entries;
    try {
      entries = await fs.readdir(dir, { withFileTypes: true });
    } catch {
      return; // dir missing or unreadable — skip
    }
    for (const entry of entries) {
      const full = join(dir, entry.name);
      if (entry.isDirectory()) {
        await walk(full);
      } else if (entry.isFile() && entry.name.startsWith("rollout-") && entry.name.endsWith(".jsonl")) {
        let stat;
        try {
          stat = await fs.stat(full);
        } catch {
          continue; // file vanished/unreadable between readdir and stat — skip
        }
        if (!newest || stat.mtimeMs > newest.mtimeMs) {
          newest = { path: full, mtimeMs: stat.mtimeMs };
        }
      }
    }
  }

  await walk(sessionsDir);
  return newest?.path;
}

function toWindow(name: string, raw: unknown): QuotaWindow | undefined {
  const r = asRecord(raw);
  if (!r) return undefined;
  const usedPercent = asNumber(r.used_percent);
  const resetsAt = asNumber(r.resets_at);
  if (usedPercent === undefined || resetsAt === undefined) return undefined;
  return { name, usedPercent, resetsAt };
}

interface CodexCreds {
  accessToken: string;
  accountId?: string;
}

function cleanToken(token: string): string {
  return token.replace(/[^\x21-\x7e]/g, "");
}

async function readCreds(baseDir: string): Promise<CodexCreds | undefined> {
  try {
    const root = asRecord(JSON.parse(await fs.readFile(join(baseDir, "auth.json"), "utf8")));
    const tokens = asRecord(root?.tokens);
    const accessToken = asString(tokens?.access_token);
    if (!accessToken) return undefined;
    return { accessToken, accountId: asString(tokens?.account_id) };
  } catch {
    return undefined;
  }
}

function liveWindow(name: string, raw: unknown): QuotaWindow | undefined {
  const r = asRecord(raw);
  if (!r) return undefined;
  const usedPercent = asNumber(r.used_percent);
  const resetsAt = asNumber(r.reset_at);
  if (usedPercent === undefined || resetsAt === undefined) return undefined;
  return { name, usedPercent, resetsAt };
}

async function fetchCodexQuota(baseDir: string): Promise<ToolQuota> {
  const base: ToolQuota = {
    tool: "Codex",
    windows: [],
    source: "live",
    fetchedAt: Math.floor(Date.now() / 1000),
  };
  const creds = await readCreds(baseDir);
  if (!creds) return { ...base, error: "No Codex login found — run `codex` to sign in" };

  const token = cleanToken(creds.accessToken);
  if (!token) return { ...base, error: "Codex login token is empty — run `codex` to re-login" };

  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
    Accept: "application/json",
  };
  if (creds.accountId) headers["ChatGPT-Account-Id"] = creds.accountId;

  let response: Awaited<ReturnType<typeof fetch>>;
  try {
    response = await fetch(USAGE_URL, { headers });
  } catch {
    return { ...base, error: "Network error reaching Codex" };
  }

  let body = "";
  try {
    body = await response.text();
  } catch {
    // An unreadable body is handled below as an invalid response.
  }
  if (!response.ok) {
    if (response.status === 401) return { ...base, error: "Codex login expired — run `codex` to re-login" };
    if (response.status === 429) return { ...base, error: "Codex quota is rate-limited — try later" };
    return { ...base, error: `Codex quota request failed (HTTP ${response.status})` };
  }

  let data: unknown;
  try {
    data = JSON.parse(body);
  } catch {
    return { ...base, error: "Bad response from Codex" };
  }
  const root = asRecord(data);
  const rateLimit = asRecord(root?.rate_limit);
  const windows = [
    liveWindow("5-Hour", rateLimit?.primary_window),
    liveWindow("Weekly", rateLimit?.secondary_window),
  ].filter((window): window is QuotaWindow => window !== undefined);
  if (windows.length === 0) return { ...base, error: "No Codex quota windows returned" };

  return { ...base, windows, planType: asString(root?.plan_type) };
}

/**
 * Read Codex's most recent quota snapshot from the local session logs — offline,
 * no auth. The snapshot is only as fresh as the user's last Codex turn.
 */
async function readCodexSnapshot(overrideDir?: string): Promise<ToolQuota> {
  const base: ToolQuota = { tool: "Codex", windows: [], source: "snapshot", fetchedAt: 0 };

  const sessionsDir = join(codexBaseDir(overrideDir), "sessions");
  const file = await findNewestRollout(sessionsDir);
  if (!file) {
    return { ...base, error: "No Codex logs — run Codex once" };
  }

  let content: string;
  try {
    content = await fs.readFile(file, "utf8");
  } catch {
    return { ...base, error: "No rate-limit snapshot yet" }; // vanished/unreadable — degrade, don't throw
  }
  const lines = content.split("\n");

  // The `rate_limits` block rides on `token_count` events. Take the last one.
  for (let i = lines.length - 1; i >= 0; i--) {
    const line = lines[i].trim();
    if (!line || !line.includes("token_count")) continue;

    let parsed: unknown;
    try {
      parsed = JSON.parse(line);
    } catch {
      continue;
    }
    const obj = asRecord(parsed);
    const payload = asRecord(obj?.payload);
    if (obj?.type !== "event_msg" || payload?.type !== "token_count") continue;

    const rateLimits = asRecord(payload.rate_limits);
    if (!rateLimits) continue;

    const info = asRecord(payload.info);
    const totalUsage = asRecord(info?.total_token_usage);
    const timestampMs = typeof obj.timestamp === "string" ? Date.parse(obj.timestamp) : NaN;

    const windows = [toWindow("5-Hour", rateLimits.primary), toWindow("Weekly", rateLimits.secondary)].filter(
      (w): w is QuotaWindow => w !== undefined,
    );

    return {
      tool: "Codex",
      windows,
      planType: asString(rateLimits.plan_type),
      source: "snapshot",
      fetchedAt: Number.isNaN(timestampMs) ? 0 : Math.floor(timestampMs / 1000),
      totalTokens: asNumber(totalUsage?.total_tokens),
    };
  }

  return { ...base, error: "No rate-limit snapshot yet" };
}

/** Fetch live Codex quota, falling back to the latest local snapshot on any failure. */
export async function readCodexQuota(overrideDir?: string): Promise<ToolQuota> {
  const baseDir = codexBaseDir(overrideDir);
  const [snapshot, live] = await Promise.all([readCodexSnapshot(baseDir), fetchCodexQuota(baseDir)]);
  if (live.windows.length === 0) return snapshot.windows.length > 0 ? snapshot : live;
  return {
    ...live,
    totalTokens: snapshot.totalTokens,
    planType: live.planType ?? snapshot.planType,
  };
}
