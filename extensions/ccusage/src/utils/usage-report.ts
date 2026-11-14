import { execFile } from "child_process";
import { Cache } from "@raycast/api";
import { z } from "zod";
import { getCustomNpxPath, getUsageCommandConfiguration, preferences } from "../preferences";
import {
  SummaryUsageReport,
  SummaryUsageReportSchema,
  SessionUsageCommandResponseSchema,
  SessionUsageReport,
  SessionUsageReportSchema,
} from "../types/usage-types";
import { getExecOptions } from "./exec-options";
import { describeExecFailure, describeParseFailure } from "./parse-diagnostics";
import { getCcusageVersionSync } from "./ccusage-version";
import { stringToJSON } from "./string-to-json-schema";
import { calculateModelUsage, getRecentSessions, getTopModels } from "./usage-calculator";
import { SummarySection } from "./command-sections";

export const REPORT_CACHE_NAMESPACE = "ccusage-reports-v1";
export type ReportKind = "summary" | "sessions";
export type CachedReport<T> = { data: T; updatedAt: Record<string, number> };
const cache = new Cache({ namespace: REPORT_CACHE_NAMESPACE });
const summaryInFlight = new Map<string, Promise<SummaryUsageReport>>();
let sessionsInFlight: Promise<SessionUsageReport> | undefined;
let supportsSections = true;

function readCache<T>(kind: ReportKind, schema: z.ZodType<T, z.ZodTypeDef, unknown>): CachedReport<T> | undefined {
  try {
    const value = cache.get(kind);
    if (!value) return undefined;
    const envelope = z.object({ data: z.unknown(), updatedAt: z.record(z.number()) }).safeParse(JSON.parse(value));
    if (!envelope.success) return undefined;
    const parsed = schema.safeParse(envelope.data.data);
    return parsed.success ? { data: parsed.data, updatedAt: envelope.data.updatedAt } : undefined;
  } catch {
    return undefined;
  }
}

export function getReportRefreshInterval(): number {
  return Math.max(30, Number(preferences.usageLimitsRefreshInterval) || 60) * 1000;
}

export function getReportRefreshDelay(kind: ReportKind): number {
  const cached =
    kind === "summary" ? readCache(kind, SummaryUsageReportSchema) : readCache(kind, SessionUsageReportSchema);
  const needed = kind === "summary" ? getUsageCommandConfiguration().summarySections : ["sessions"];
  if (needed.length === 0) return getReportRefreshInterval();
  const oldest = Math.min(...needed.map((section) => cached?.updatedAt[section] ?? 0));
  return Math.max(100, oldest + getReportRefreshInterval() - Date.now());
}

function runReport(args: string[]): Promise<unknown> {
  const direct = preferences.useDirectCcusageCommand;
  const command = direct ? "ccusage" : (getCustomNpxPath() ?? "npx");
  const commandArgs = direct ? args : ["--yes", "ccusage@latest", ...args];

  return new Promise((resolve, reject) => {
    execFile(
      command,
      commandArgs,
      {
        ...getExecOptions(),
        // Large histories can take longer than 30 seconds even without contention.
        timeout: 120_000,
        maxBuffer: 80 * 1024 * 1024,
      },
      (error, stdout, stderr) => {
        const failure = describeExecFailure("ccusage report", {
          error: error ?? undefined,
          exitCode: typeof error?.code === "number" ? error.code : null,
          signal: error?.signal ?? null,
          timedOut: error?.killed === true && error.signal === "SIGTERM",
          stderr,
        });
        if (failure) {
          reject(new Error(failure));
          return;
        }

        const parsed = stringToJSON.safeParse(stdout);
        if (!parsed.success) {
          reject(
            new Error(describeParseFailure("Invalid usage report", stdout, parsed.error, getCcusageVersionSync())),
          );
          return;
        }
        resolve(parsed.data);
      },
    );
  });
}

async function loadSummaryReport(requested: SummarySection[]): Promise<SummaryUsageReport> {
  let raw: unknown;
  if (requested.length === 1) {
    raw = await runReport([requested[0], "--json"]);
  } else if (supportsSections) {
    try {
      // Small summaries share a scan without waiting for the large session report.
      raw = await runReport([requested[0], "--json", "--sections", requested.join(",")]);
    } catch (error) {
      // Older direct installations predate --sections. Only an unsupported-option
      // error warrants a fallback; a timeout or network failure must stay visible.
      if (
        !(error instanceof Error) ||
        !/(?:unknown|unexpected|unrecognized|unsupported)[^\n]*sections/i.test(error.message)
      ) {
        throw error;
      }
      supportsSections = false;
    }
  }

  if (raw === undefined && !supportsSections) {
    // Keep legacy reports sequential so they do not compete for CPU and disk.
    const sections: unknown[] = [];
    for (const section of requested) {
      sections.push(await runReport([section, "--json"]));
    }
    raw = Object.assign({}, ...sections);
  }

  const parsed = SummaryUsageReportSchema.refine((data) => requested.every((section) => data[section] !== undefined), {
    message: "Missing requested summary section",
  }).safeParse(raw);
  if (!parsed.success) {
    throw new Error(
      describeParseFailure("Invalid usage report", JSON.stringify(raw), parsed.error, getCcusageVersionSync()),
    );
  }
  return parsed.data;
}

export function getSummaryReport(
  force = false,
  requested = getUsageCommandConfiguration().summarySections,
): Promise<SummaryUsageReport | undefined> {
  const cached = readCache("summary", SummaryUsageReportSchema);
  const key = [...requested].sort().join(",");
  const pending = summaryInFlight.get(key);
  if (pending) return pending;
  const needed = requested.filter(
    (section) =>
      force || !cached?.data[section] || Date.now() - (cached.updatedAt[section] ?? 0) >= getReportRefreshInterval(),
  );
  if (needed.length === 0) return Promise.resolve(cached?.data);

  const promise = loadSummaryReport(needed)
    .then((data) => {
      // Retain other sections when visibility changes. Only fetched sections gain
      // a new timestamp; a fresh daily report cannot make an old week look fresh.
      const previous = readCache("summary", SummaryUsageReportSchema);
      const snapshot = {
        data: { ...previous?.data, ...data },
        updatedAt: { ...previous?.updatedAt, ...Object.fromEntries(needed.map((section) => [section, Date.now()])) },
      };
      cache.set("summary", JSON.stringify(snapshot));
      return snapshot.data;
    })
    .finally(() => summaryInFlight.delete(key));
  summaryInFlight.set(key, promise);
  return promise;
}

async function loadSessionReport(): Promise<SessionUsageReport> {
  const raw = await runReport(["session", "--json"]);
  const parsed = SessionUsageCommandResponseSchema.safeParse(raw);
  if (!parsed.success) {
    throw new Error(
      describeParseFailure("Invalid session report", JSON.stringify(raw), parsed.error, getCcusageVersionSync()),
    );
  }

  // Aggregate before trimming. Older sessions still contribute to every model's
  // cost, token count, and session count; the views display only five recent rows.
  return {
    recentSessions: getRecentSessions(parsed.data.sessions, 5),
    topModels: getTopModels(calculateModelUsage(parsed.data.sessions), 5),
  };
}

export function getSessionReport(force = false): Promise<SessionUsageReport> {
  if (sessionsInFlight) return sessionsInFlight;
  const cached = readCache("sessions", SessionUsageReportSchema);
  if (!force && cached && Date.now() - (cached.updatedAt.sessions ?? 0) < getReportRefreshInterval()) {
    return Promise.resolve(cached.data);
  }
  sessionsInFlight = loadSessionReport()
    .then((data) => {
      cache.set("sessions", JSON.stringify({ data, updatedAt: { sessions: Date.now() } }));
      return data;
    })
    .finally(() => {
      sessionsInFlight = undefined;
    });
  return sessionsInFlight;
}
