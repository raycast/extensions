import { execFile } from "node:child_process";
import { promisify } from "node:util";
import os from "node:os";
import { Cache } from "@raycast/api";
import type { PlanUsageData, PlanUsageResponse } from "../types";
import { getShellProxy, buildClaudeEnv } from "./fs-utils";

const execFileAsync = promisify(execFile);

const cache = new Cache();
const CACHE_KEY = "plan-usage";
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

function getCachedUsage(): PlanUsageData | null {
  const raw = cache.get(CACHE_KEY);
  if (!raw) return null;
  try {
    const data: PlanUsageData = JSON.parse(raw);
    if (Date.now() - data.fetchedAt > CACHE_TTL_MS) return null;
    return data;
  } catch {
    return null;
  }
}

async function getAccessToken(): Promise<string | null> {
  try {
    const username = os.userInfo().username;
    const { stdout } = await execFileAsync("security", [
      "find-generic-password",
      "-s",
      "Claude Code-credentials",
      "-a",
      username,
      "-w",
    ]);
    const data = JSON.parse(stdout.trim());
    return data?.claudeAiOauth?.accessToken ?? null;
  } catch {
    return null;
  }
}

export async function getPlanUsage(): Promise<PlanUsageData | null> {
  const cached = getCachedUsage();
  if (cached) return cached;

  const token = await getAccessToken();
  if (!token) return null;

  try {
    const proxyEnv = getShellProxy();
    const env = buildClaudeEnv(proxyEnv);

    const { stdout } = await execFileAsync(
      "curl",
      [
        "-s",
        "-f",
        "-H",
        `Authorization: Bearer ${token}`,
        "-H",
        "anthropic-beta: oauth-2025-04-20",
        "https://api.anthropic.com/api/oauth/usage",
      ],
      { env, timeout: 15000 },
    );

    const raw: PlanUsageResponse = JSON.parse(stdout);
    const data: PlanUsageData = {
      fiveHour: raw.five_hour,
      sevenDay: raw.seven_day,
      extraUsage: raw.extra_usage,
      fetchedAt: Date.now(),
    };

    cache.set(CACHE_KEY, JSON.stringify(data));
    return data;
  } catch {
    return null;
  }
}

export function formatUtilization(util: number): string {
  return `${Math.round(util)}%`;
}

export function formatResetTime(resetsAt: string | null): string {
  if (!resetsAt) return "";
  const diff = new Date(resetsAt).getTime() - Date.now();
  if (diff <= 0) return "now";

  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

  if (hours >= 24) {
    const days = Math.floor(hours / 24);
    const remainHours = hours % 24;
    return remainHours > 0 ? `${days}d ${remainHours}h` : `${days}d`;
  }
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

export function generateQuotaBar(utilization: number): string {
  const barWidth = 20;
  const filled = Math.round((utilization / 100) * barWidth);
  const empty = barWidth - filled;
  return "\u2588".repeat(filled) + "\u2591".repeat(empty);
}
