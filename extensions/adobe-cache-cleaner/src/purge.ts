import { execFile } from "child_process";
import fs from "fs/promises";
import { promisify } from "util";
import { Alert, confirmAlert, Icon, showToast, Toast, trash } from "@raycast/api";
import { APPS, AppId, CacheLocation, HOME, prefs } from "./locations";

const run = promisify(execFile);
const DU = "/usr/bin/du";
const PS = "/bin/ps";

export function formatBytes(bytes: number): string {
  if (bytes < 1000) return `${bytes} B`;
  const units = ["KB", "MB", "GB", "TB"];
  let value = bytes;
  let i = -1;
  do {
    value /= 1000;
    i++;
  } while (value >= 1000 && i < units.length - 1);
  return `${value >= 100 ? value.toFixed(0) : value.toFixed(1)} ${units[i]}`;
}

/** Disk usage of the given paths in bytes (missing paths count as 0). */
export async function measure(targets: string[]): Promise<number> {
  let total = 0;
  for (let i = 0; i < targets.length; i += 100) {
    const chunk = targets.slice(i, i + 100);
    let out = "";
    try {
      out = (await run(DU, ["-sk", ...chunk], { maxBuffer: 32 * 1024 * 1024 })).stdout;
    } catch (error) {
      // du exits 1 when a path vanished or is unreadable, but still prints the rest.
      out = (error as { stdout?: string }).stdout ?? "";
    }
    for (const line of out.split("\n")) {
      const kb = parseInt(line.split("\t")[0], 10);
      if (!Number.isNaN(kb)) total += kb * 1024;
    }
  }
  return total;
}

export async function runningApps(): Promise<Set<AppId>> {
  const running = new Set<AppId>();
  try {
    const { stdout } = await run(PS, ["-axww", "-o", "comm="], { maxBuffer: 16 * 1024 * 1024 });
    for (const [id, app] of Object.entries(APPS) as [AppId, (typeof APPS)[AppId]][]) {
      if (app.bundle.test(stdout)) running.add(id);
    }
  } catch {
    // If ps fails we can't tell — treat everything as closed rather than blocking the user.
  }
  return running;
}

export function appNames(ids: Iterable<AppId>): string {
  const names = [...new Set(ids)].map((id) => APPS[id].name);
  if (names.length <= 1) return names.join("");
  return `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
}

async function freeSpace(): Promise<number | undefined> {
  try {
    const s = await fs.statfs(HOME);
    return s.bavail * s.bsize;
  } catch {
    return undefined;
  }
}

export interface PurgeOutcome {
  purged: CacheLocation[];
  freedBytes: number;
  usedTrash: boolean;
  failures: { path: string; error: string }[];
  /** Set when files were deleted but the disk didn't get the space back (local Time Machine snapshots). */
  spaceHeldBack: boolean;
}

/**
 * Asks for confirmation only when a cache belongs to an app that's still open,
 * then deletes (or trashes) everything and reports how much space came back.
 *
 * `bulk` = "Purge All": when some caches are unsafe, the dialog lets the user
 * purge everything anyway or skip just the unsafe ones.
 */
export async function confirmAndPurge(
  locations: CacheLocation[],
  sizes: Map<string, number>,
  bulk: boolean,
): Promise<PurgeOutcome | undefined> {
  const running = await runningApps();
  const risky = locations.filter((l) => l.owners.some((o) => running.has(o)));
  let selected = locations;

  if (risky.length) {
    const openApps = appNames(risky.flatMap((l) => l.owners.filter((o) => running.has(o))));
    const verb = openApps.includes(" and ") ? "are" : "is";
    const listing = risky.map((l) => `• ${l.title}  (${formatBytes(sizes.get(l.id) ?? 0)})`).join("\n");
    const message =
      `These caches belong to apps that are open right now:\n\n${listing}\n\n` +
      `Deleting them while ${openApps} ${verb} running can crash the app, corrupt its cache database, ` +
      `or make it re-conform media mid-session. Quit ${openApps} first for a safe purge.`;
    const partial = bulk && risky.length < locations.length;

    const ok = await confirmAlert({
      title: `${openApps} ${verb} still open`,
      message,
      icon: Icon.Warning,
      primaryAction: {
        title: partial ? "Purge Everything Anyway" : "Purge Anyway",
        style: Alert.ActionStyle.Destructive,
      },
      dismissAction: { title: partial ? `Skip ${openApps} Caches` : "Cancel" },
    });
    if (!ok) {
      if (!partial) return undefined;
      selected = locations.filter((l) => !risky.includes(l));
    }
  }

  const { useTrash } = prefs();
  const targets = selected.flatMap((l) => l.targets);
  const before = selected.reduce((sum, l) => sum + (sizes.get(l.id) ?? 0), 0);

  const toast = await showToast({
    style: Toast.Style.Animated,
    title: useTrash ? "Moving caches to Trash…" : "Purging caches…",
    message: formatBytes(before),
  });

  const freeBefore = await freeSpace();
  const failures: PurgeOutcome["failures"] = [];

  if (useTrash) {
    try {
      await trash(targets);
    } catch {
      for (const t of targets) {
        try {
          await trash(t);
        } catch (error) {
          failures.push({ path: t, error: String(error) });
        }
      }
    }
  } else {
    for (const t of targets) {
      try {
        await fs.rm(t, { recursive: true, force: true, maxRetries: 2 });
      } catch (error) {
        failures.push({ path: t, error: (error as NodeJS.ErrnoException).code ?? String(error) });
      }
    }
  }

  const leftover = failures.length ? await measure(failures.map((f) => f.path)) : 0;
  const freedBytes = Math.max(0, before - leftover);
  const freeAfter = await freeSpace();
  const spaceHeldBack =
    !useTrash &&
    freeBefore !== undefined &&
    freeAfter !== undefined &&
    freedBytes > 1e9 &&
    freeAfter - freeBefore < freedBytes * 0.5;

  await toast.hide();
  return { purged: selected, freedBytes, usedTrash: useTrash, failures, spaceHeldBack };
}

export function outcomeTitle(o: PurgeOutcome): string {
  return o.usedTrash ? `Moved ${formatBytes(o.freedBytes)} to Trash` : `Freed ${formatBytes(o.freedBytes)}`;
}

export function outcomeMessage(o: PurgeOutcome): string | undefined {
  const parts: string[] = [];
  if (o.failures.length) parts.push(`${o.failures.length} item(s) couldn't be removed (in use or no permission).`);
  if (o.spaceHeldBack)
    parts.push("macOS hasn't released all the space yet — local Time Machine snapshots can hold it for a while.");
  if (o.usedTrash) parts.push("Empty the Trash to get the space back.");
  return parts.length ? parts.join(" ") : undefined;
}
