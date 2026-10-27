import { Cache } from "@raycast/api";
import { execFile } from "node:child_process";
import * as api from "./api";
import {
  activeSite,
  clipboardHost,
  frontmostApp,
  type AppContext,
  type SiteContext,
} from "./context";
import { errorMessage } from "./control";
import { matchingPattern } from "./host";
import type { AppRoutingMode, Preset, Status, Target } from "./types";

export interface SiteRow {
  host: string;
  title: string | null;
  /** The rule that already routes this host, when there is one. */
  coveredBy: { pattern: string; id: string } | null;
}

export interface AppRow extends AppContext {
  mode: AppRoutingMode;
  ruleId: string | null;
  appsEnabled: boolean;
}

export type Dashboard =
  | {
      kind: "ready";
      status: Status;
      targets: Target[];
      presets: Preset[];
      /** A host on the clipboard that is not routed yet, when no site row exists. */
      suggestion: string | null;
      site: SiteRow | null;
      app: AppRow | null;
    }
  | {
      kind: "unavailable";
      reason: "not-running" | "no-control";
      message: string;
    };

const cache = new Cache();
const CACHE_KEY = "dashboard.v2";

/**
 * Synchronous cache read so the list paints immediately on a second open. The
 * context rows are never cached: a stale "the tab you're on" would be wrong.
 */
export function readDashboardCache(): Dashboard | undefined {
  const raw = cache.get(CACHE_KEY);
  if (!raw) return undefined;
  try {
    const parsed = JSON.parse(raw) as Dashboard;
    if (parsed.kind !== "ready") return undefined;
    return { ...parsed, site: null, app: null, suggestion: null };
  } catch {
    return undefined;
  }
}

function writeDashboardCache(dashboard: Dashboard): void {
  if (dashboard.kind !== "ready") return;
  cache.set(CACHE_KEY, JSON.stringify(dashboard));
}

function buildSiteRow(site: SiteContext, targets: Target[]): SiteRow {
  const pattern = matchingPattern(
    site.host,
    targets.map((target) => target.pattern),
  );
  const match = pattern ? targets.find((target) => target.pattern === pattern) : undefined;

  return {
    host: site.host,
    title: site.title,
    coveredBy: match ? { pattern: match.pattern, id: match.id } : null,
  };
}

async function buildAppRow(app: AppContext): Promise<AppRow | null> {
  try {
    const [apps, resolution] = await Promise.all([
      api.getApps(),
      api.resolveApp({ bundleID: app.bundleId }),
    ]);
    return {
      ...app,
      mode: resolution.mode,
      ruleId: resolution.ruleID,
      appsEnabled: apps.enabled,
    };
  } catch {
    return null;
  }
}

async function clipboardSuggestion(targets: Target[]): Promise<string | null> {
  const host = await clipboardHost();
  if (!host) return null;
  const covered = matchingPattern(
    host,
    targets.map((target) => target.pattern),
  );
  return covered ? null : host;
}

function appIsRunning(): Promise<boolean> {
  return new Promise((resolve) => {
    execFile("pgrep", ["-x", "ProxyManager"], { timeout: 1_500 }, (error, stdout) => {
      resolve(!error && stdout.trim().length > 0);
    });
  });
}

/**
 * One round trip set: status first (it can raise the consent sheet), then the
 * reads and the local context in parallel. Failures become a value, not a throw,
 * so the view can render one actionable empty state.
 */
export async function loadDashboard(): Promise<Dashboard> {
  try {
    const status = await api.getStatus();
    const [targets, presets, app, site] = await Promise.all([
      api.listTargets(),
      api.listPresets(),
      frontmostApp(),
      activeSite(),
    ]);

    const siteRow = site ? buildSiteRow(site, targets) : null;
    const appRow = app ? await buildAppRow(app) : null;

    const dashboard: Dashboard = {
      kind: "ready",
      status,
      targets,
      presets,
      site: siteRow,
      app: appRow,
      suggestion: siteRow ? null : await clipboardSuggestion(targets),
    };

    writeDashboardCache(dashboard);
    return dashboard;
  } catch (error) {
    const running = await appIsRunning();
    return {
      kind: "unavailable",
      reason: running ? "no-control" : "not-running",
      message: errorMessage(error),
    };
  }
}
