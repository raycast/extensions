import { readFileSync, readdirSync } from "fs";
import { homedir } from "os";
import { join } from "path";

export const CONFIG_DIR = join(homedir(), ".raycast-firefox");

/**
 * A native host serving one running Firefox profile, as registered by the
 * host in `~/.raycast-firefox/hosts/<firefoxPid>.json`.
 */
export interface Host {
  /** Stable identity for this session: the Firefox PID, or the port for a legacy host. */
  key: string;
  pid: number | null;
  firefoxPid: number | null;
  port: number;
  profilePath: string | null;
}

function isValidPort(port: unknown): port is number {
  return Number.isInteger(port) && (port as number) > 0 && (port as number) <= 65535;
}

function isValidPid(pid: unknown): pid is number {
  return Number.isInteger(pid) && (pid as number) > 0;
}

function processIsAlive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch (err) {
    return (err as NodeJS.ErrnoException).code === "EPERM";
  }
}

/**
 * List every native host that is serving HTTP, ordered by Firefox PID.
 *
 * Skips records without a port yet, records whose host process has exited,
 * and unreadable files. When no records exist, falls back to the single
 * `port` file written by hosts that predate per-profile records.
 */
export function readHosts(configDir: string = CONFIG_DIR, isAlive: (pid: number) => boolean = processIsAlive): Host[] {
  const hosts: Host[] = [];
  let names: string[] = [];
  try {
    names = readdirSync(join(configDir, "hosts")).filter((name) => name.endsWith(".json"));
  } catch {
    // No hosts directory: no per-profile host has run yet.
  }

  for (const name of names) {
    try {
      const record = JSON.parse(readFileSync(join(configDir, "hosts", name), "utf-8")) as Record<string, unknown>;
      const { pid, firefoxPid, port, profilePath } = record;
      if (!isValidPort(port) || !isValidPid(pid) || !isValidPid(firefoxPid) || !isAlive(pid)) continue;
      hosts.push({
        key: String(firefoxPid),
        pid,
        firefoxPid,
        port,
        profilePath: typeof profilePath === "string" ? profilePath : null,
      });
    } catch {
      // Partially written or corrupt record: skip it.
    }
  }

  if (hosts.length > 0) {
    return hosts.sort((a, b) => (a.firefoxPid ?? 0) - (b.firefoxPid ?? 0));
  }

  try {
    const port = parseInt(readFileSync(join(configDir, "port"), "utf-8").trim(), 10);
    if (isValidPort(port)) {
      return [{ key: `port-${port}`, pid: null, firefoxPid: null, port, profilePath: null }];
    }
  } catch {
    // No legacy port file either.
  }
  return [];
}

/** How long one host may take before it is left out of the results. */
export const HOST_TIMEOUT_MS = 5000;

function withTimeout<T>(promise: Promise<T>, ms: number, host: Host): Promise<T> {
  let timer: NodeJS.Timeout | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(`Firefox host on port ${host.port} didn't respond within ${ms}ms`)), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

/**
 * Run `fetchOne` against every host and combine the results.
 *
 * A host that fails, or takes longer than `timeoutMs`, is left out so one
 * broken or stalled profile doesn't hide or hold back the others' tabs.
 * Rejects with the first failure only when every host fails.
 */
export async function fetchFromHosts<T>(
  hosts: Host[],
  fetchOne: (host: Host) => Promise<T[]>,
  timeoutMs: number = HOST_TIMEOUT_MS
): Promise<T[]> {
  const results = await Promise.allSettled(hosts.map((host) => withTimeout(fetchOne(host), timeoutMs, host)));
  const fulfilled = results.filter((r): r is PromiseFulfilledResult<T[]> => r.status === "fulfilled");
  if (fulfilled.length === 0 && results.length > 0) {
    throw (results[0] as PromiseRejectedResult).reason;
  }
  return fulfilled.flatMap((r) => r.value);
}

/** A tab as fetched from a host. Tab and window IDs are only unique within one host. */
interface HostScoped {
  host: { key: string };
  id: number;
  windowId: number;
}

/** Identity of a tab across every connected profile. */
export function tabKey(tab: HostScoped): string {
  return `${tab.host.key}:${tab.id}`;
}

/** Identity of a window across every connected profile. */
export function windowKey(tab: HostScoped): string {
  return `${tab.host.key}:${tab.windowId}`;
}

/**
 * Number every window 1..n across all profiles, keyed by windowKey. Windows
 * are grouped by profile, in `profileOrder` (then host key) order, and by
 * window ID within a profile, so each W<n> is unique and a profile's windows
 * sit together.
 */
export function numberWindows(tabs: HostScoped[], profileOrder: (hostKey: string) => number): Map<string, number> {
  const windows = [...new Map(tabs.map((t) => [windowKey(t), t])).values()].sort(
    (a, b) =>
      profileOrder(a.host.key) - profileOrder(b.host.key) ||
      a.host.key.localeCompare(b.host.key) ||
      a.windowId - b.windowId
  );
  return new Map(windows.map((t, i) => [windowKey(t), i + 1]));
}

/** How often Search Firefox Tabs re-reads tabs while it is open. */
export const TAB_REFRESH_MS = 2000;

/** The tab fields the list shows or sorts by. */
interface ShownTab extends HostScoped {
  title?: string;
  url?: string;
  active?: boolean;
  pinned?: boolean;
  status?: string;
  favIconUrl?: string | null;
  lastAccessed?: number;
  container?: { name: string } | null;
}

function tabSignature(t: ShownTab): string {
  return JSON.stringify([
    tabKey(t),
    t.windowId,
    t.title,
    t.url,
    t.active,
    t.pinned,
    t.status,
    t.favIconUrl,
    t.lastAccessed,
    t.container?.name ?? null,
  ]);
}

/**
 * Whether a refreshed tab list differs from the shown one in anything the
 * list displays or sorts by. Raycast re-serializes the whole list on every
 * render, so an unchanged refresh must not re-render.
 */
export function tabsChanged(shown: ShownTab[], fresh: ShownTab[]): boolean {
  if (shown.length !== fresh.length) return true;
  return shown.some((t, i) => tabSignature(t) !== tabSignature(fresh[i]));
}
