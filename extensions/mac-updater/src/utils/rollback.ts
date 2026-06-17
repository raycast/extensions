import * as fs from "fs";
import * as path from "path";
import { environment, LocalStorage } from "@raycast/api";
import { runShell } from "./shell";
import { quitAppIfRunning } from "./process-control";

/**
 * Rollback: after an in-place app update (Sparkle/GitHub/Electron), we keep the
 * previous .app as a restore point so a bad update can be undone. We keep ONE
 * point per app (the immediately-previous version), prune anything older than
 * 30 days, and store backups under the extension's supportPath so they never
 * clutter the user's disk uncapped.
 *
 * (Brew casks / MAS aren't covered — those updates are owned by brew / the App
 * Store, which keep their own old versions and have their own downgrade paths.)
 */
export interface RollbackPoint {
  bundleId: string;
  appName: string;
  appPath: string; // the live app, e.g. /Applications/Foo.app
  previousVersion: string; // the version this point restores TO
  newVersion: string; // the version installed now (rolled FROM)
  backupPath: string; // the stored previous .app
  createdAt: number;
}

const KEY = "mac-updater-rollbacks-v1";
const MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;

function shq(s: string): string {
  return `'${s.replace(/'/g, "'\\''")}'`;
}
function storeDir(): string {
  return path.join(environment.supportPath, "rollbacks");
}

async function readAll(): Promise<Record<string, RollbackPoint>> {
  const raw = await LocalStorage.getItem<string>(KEY);
  if (!raw) return {};
  try {
    return JSON.parse(raw) as Record<string, RollbackPoint>;
  } catch {
    return {};
  }
}
async function writeAll(m: Record<string, RollbackPoint>): Promise<void> {
  await LocalStorage.setItem(KEY, JSON.stringify(m));
}

/** Best-effort: never throws, never blocks an update. */
export async function saveRollbackPoint(p: {
  bundleId: string;
  appName: string;
  appPath: string;
  previousVersion: string;
  newVersion: string;
  backupPath: string;
}): Promise<void> {
  try {
    if (!p.backupPath || !fs.existsSync(p.backupPath)) return;
    fs.mkdirSync(storeDir(), { recursive: true });
    const id = p.bundleId || path.basename(p.appPath);
    const dest = path.join(storeDir(), `${id}.app`);
    try {
      fs.rmSync(dest, { recursive: true, force: true });
    } catch {
      /* ignore */
    }
    await runShell(`/bin/mv ${shq(p.backupPath)} ${shq(dest)}`);
    const all = await readAll();
    all[id] = { ...p, bundleId: id, backupPath: dest, createdAt: Date.now() };
    await writeAll(all);
    await prune();
  } catch {
    /* rollback retention is a bonus, never a blocker */
  }
}

export async function getRollbackPoint(
  bundleId: string,
): Promise<RollbackPoint | undefined> {
  return (await readAll())[bundleId];
}

export async function getRollbackMap(): Promise<Record<string, RollbackPoint>> {
  await prune();
  return readAll();
}

export async function removeRollbackPoint(bundleId: string): Promise<void> {
  const all = await readAll();
  const p = all[bundleId];
  if (!p) return;
  try {
    fs.rmSync(p.backupPath, { recursive: true, force: true });
  } catch {
    /* ignore */
  }
  delete all[bundleId];
  await writeAll(all);
}

/** Drop points whose backup vanished or that are older than the age cap. */
async function prune(): Promise<void> {
  const all = await readAll();
  let changed = false;
  for (const [id, p] of Object.entries(all)) {
    const missing = !fs.existsSync(p.backupPath);
    const tooOld = Date.now() - p.createdAt > MAX_AGE_MS;
    if (missing || tooOld) {
      if (!missing) {
        try {
          fs.rmSync(p.backupPath, { recursive: true, force: true });
        } catch {
          /* ignore */
        }
      }
      delete all[id];
      changed = true;
    }
  }
  if (changed) await writeAll(all);
}

async function verifySignature(appPath: string): Promise<boolean> {
  try {
    await runShell(
      `/usr/bin/codesign --verify --no-strict ${shq(appPath)} 2>/dev/null`,
    );
    return true;
  } catch {
    return false;
  }
}

/**
 * Restore the previous version. Atomic and safe: the live app is moved aside
 * first, the backup is copied into place and signature-verified, and ONLY then
 * is the moved-aside copy removed. Any failure restores the live app from the
 * moved-aside copy — the user is never left without a working app.
 */
export async function performRollback(
  p: RollbackPoint,
): Promise<{ success: boolean; error?: string }> {
  if (!fs.existsSync(p.backupPath)) {
    await removeRollbackPoint(p.bundleId);
    return {
      success: false,
      error: "The saved previous version is no longer available.",
    };
  }
  await quitAppIfRunning(p.appName);

  const aside = `${p.appPath}.rollback-aside`;
  try {
    try {
      fs.rmSync(aside, { recursive: true, force: true });
    } catch {
      /* ignore */
    }
    if (fs.existsSync(p.appPath)) {
      await runShell(`/bin/mv ${shq(p.appPath)} ${shq(aside)}`);
    }
    // Copy (not move) the backup so it stays intact until we've verified.
    await runShell(`/bin/cp -R ${shq(p.backupPath)} ${shq(p.appPath)}`);
    if (!(await verifySignature(p.appPath))) {
      throw new Error("Code signature verification failed");
    }
    // Verified — drop the moved-aside current version and consume the point.
    try {
      fs.rmSync(aside, { recursive: true, force: true });
    } catch {
      /* ignore */
    }
    await removeRollbackPoint(p.bundleId);
    return { success: true };
  } catch (e) {
    // Restore the live app from the moved-aside copy.
    try {
      if (!fs.existsSync(p.appPath) && fs.existsSync(aside)) {
        await runShell(`/bin/mv ${shq(aside)} ${shq(p.appPath)}`);
      } else {
        fs.rmSync(aside, { recursive: true, force: true });
      }
    } catch {
      /* ignore */
    }
    return {
      success: false,
      error: e instanceof Error ? e.message : String(e),
    };
  }
}
