/**
 * Installing a style's icon data from inside the extension.
 *
 * **Why this exists.** The icon data is not in the published bundle — it is
 * proprietary and gitignored — so a Store install starts with an empty grid.
 * Originally the only remedy was `npm run build:icons`, which lives in
 * `scripts/` and therefore exists *only in a clone of the repo*. A Store user
 * has no clone, so the offered fix was unrunnable and the extension was
 * effectively broken on install.
 *
 * The build script needs nothing a Store install lacks: a registry fetch, `tar`
 * (present at `/usr/bin/tar` on macOS and shipped with Windows 10+), and a pure
 * parser. So the same pipeline runs here, writing into `environment.supportPath`
 * — a directory the extension owns and that survives updates, unlike `assets/`.
 *
 * `scripts/build-manifest.mjs` remains for development, and both write the same
 * format so either source works.
 */

import { environment } from "@raycast/api";
import { execFile } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  renameSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { open } from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, join } from "node:path";
import { promisify } from "node:util";
import { parseIconModule } from "./parse-icon-module";
import { invalidateManifests } from "./manifest";

const execFileAsync = promisify(execFile);

const REGISTRY = "https://registry.npmjs.org";
const SCOPE = "@central-icons-react";

/**
 * Network bounds.
 *
 * Without a deadline a stalled connection hangs the install indefinitely behind
 * an animated toast, with no way out but quitting Raycast — `fetch` has no
 * default timeout. The size cap bounds what a bad response can cost: a style
 * tarball is ~1.5 MB, so 64 MB is far above any real archive and far below the
 * command's 100 MB heap ceiling.
 */
const REGISTRY_TIMEOUT_MS = 15_000;
const DOWNLOAD_TIMEOUT_MS = 60_000;
const MAX_ARCHIVE_BYTES = 64 * 1024 * 1024;

/**
 * Where installed icon data lives.
 *
 * `environment.supportPath`, not `assets/`: the bundle directory is replaced
 * wholesale on every extension update, which would silently delete every style
 * the user installed. Support path persists.
 */
export function dataDir(): string {
  return join(environment.supportPath, "icons");
}

/** Upstream ships `Vehicles` (4) and `Vehicles & Aircrafts` (35) separately. */
const CATEGORY_MERGES = new Map([["Vehicles", "Vehicles & Aircrafts"]]);

export interface InstallProgress {
  (message: string): void;
}

/**
 * Download, parse, and install one style.
 *
 * Mirrors `scripts/build-manifest.mjs`, including its atomic-write discipline:
 * temporaries are renamed into place with geometry first and the index last, so
 * an interrupted install leaves any previous working data intact rather than a
 * style that claims to be installed but reads blank.
 */
export async function installStyle(style: string, onProgress: InstallProgress = () => {}): Promise<string> {
  // `mkdtemp` rather than a pid-derived name: two installs in the same process
  // would otherwise share a directory, and the `finally` cleanup below would
  // delete the other's in-flight files.
  const work = mkdtempSync(join(tmpdir(), `central-icons-${style}-`));

  try {
    onProgress("Resolving package…");
    const response = await fetch(`${REGISTRY}/${encodeURIComponent(`${SCOPE}/${style}`)}`, {
      signal: AbortSignal.timeout(REGISTRY_TIMEOUT_MS),
    });
    if (!response.ok) throw new Error(`Registry lookup failed: ${response.status} ${response.statusText}`);
    const meta = (await response.json()) as {
      "dist-tags"?: { latest?: string };
      versions?: Record<string, { dist?: { tarball?: string } }>;
    };
    const version = meta["dist-tags"]?.latest;
    const tarball = version ? meta.versions?.[version]?.dist?.tarball : undefined;
    if (!version || !tarball) throw new Error(`No published version found for ${style}`);

    onProgress(`Downloading v${version}…`);
    const archive = await fetch(tarball, { signal: AbortSignal.timeout(DOWNLOAD_TIMEOUT_MS) });
    if (!archive.ok) throw new Error(`Download failed: ${archive.status} ${archive.statusText}`);

    // Reject an oversized archive on the declared length before reading a byte.
    // A style tarball is ~1.5 MB; anything near the cap means the registry
    // returned something other than what we asked for.
    const declared = Number(archive.headers.get("content-length"));
    if (Number.isFinite(declared) && declared > MAX_ARCHIVE_BYTES) {
      throw new Error(`Archive is ${(declared / 1e6).toFixed(1)} MB, over the ${MAX_ARCHIVE_BYTES / 1e6} MB limit`);
    }

    const tgz = join(work, "package.tgz");
    await downloadToFile(archive, tgz);

    onProgress("Extracting…");
    // `tar` is at /usr/bin/tar on macOS and ships with Windows 10+; both read
    // gzip natively, so no JS tar dependency is needed.
    await execFileAsync("tar", ["xzf", tgz, "-C", work], { timeout: 120_000 });
    const pkgRoot = join(work, "package");
    if (!existsSync(pkgRoot)) throw new Error("Unexpected archive layout");

    onProgress("Parsing icons…");
    const built = buildFromPackage(pkgRoot, style, version);

    onProgress("Writing…");
    writeAtomically(style, built);

    return version;
  } finally {
    rmSync(work, { recursive: true, force: true });
  }
}

/**
 * Stream a response to disk, enforcing the size cap as it goes.
 *
 * `await response.arrayBuffer()` would buffer the entire body first, so a
 * check on its length reports the overrun only *after* paying for it — and a
 * chunked response (no `content-length`) skips the header check entirely, so
 * that was the only bound. Under a 100 MB heap cap that is the difference
 * between a caught error and a killed command.
 *
 * Reading chunk by chunk keeps peak memory at one chunk regardless of what the
 * server sends, and aborts the moment the running total crosses the limit
 * rather than at the end of the transfer.
 */
async function downloadToFile(response: Response, destination: string): Promise<void> {
  if (!response.body) throw new Error("Download returned an empty body");

  const handle = await open(destination, "w");
  let received = 0;
  try {
    for await (const chunk of response.body as unknown as AsyncIterable<Uint8Array>) {
      received += chunk.length;
      if (received > MAX_ARCHIVE_BYTES) {
        throw new Error(`Archive exceeds the ${MAX_ARCHIVE_BYTES / 1e6} MB limit`);
      }
      // `write` may accept fewer bytes than offered, so loop until the chunk is
      // fully on disk. Ignoring the count silently truncates the archive, and a
      // truncated tarball fails later at `tar` with an error that says nothing
      // about the real cause.
      let written = 0;
      while (written < chunk.length) {
        const result = await handle.write(chunk, written, chunk.length - written);
        if (result.bytesWritten <= 0) throw new Error("Download stalled while writing to disk");
        written += result.bytesWritten;
      }
    }
  } finally {
    await handle.close();
  }

  if (received === 0) throw new Error("Download returned no data");
}

interface BuiltStyle {
  index: string;
  blob: Buffer;
  totalIcons: number;
}

/** Parse every component in an extracted package into our manifest format. */
function buildFromPackage(pkgRoot: string, style: string, version: string): BuiltStyle {
  const indexPath = join(pkgRoot, "icons-index.json");
  if (!existsSync(indexPath)) throw new Error("Package is missing icons-index.json");
  const upstream = JSON.parse(readFileSync(indexPath, "utf8")) as {
    categories?: Record<string, { icons?: string[] }>;
    iconAliases?: Record<string, string>;
    totalIcons?: number;
  };

  const categoryOf = new Map<string, string>();
  for (const [rawName, entry] of Object.entries(upstream.categories ?? {})) {
    const name = CATEGORY_MERGES.get(rawName) ?? rawName;
    for (const icon of entry.icons ?? []) categoryOf.set(icon, name);
  }

  const names = readdirSync(pkgRoot)
    .filter((n) => n.startsWith("Icon") && existsSync(join(pkgRoot, n, "index.mjs")))
    .sort();

  const icons: { name: string; category: string | null; keywords: string[] }[] = [];
  const chunks: Buffer[] = [];
  const offsets: Record<string, [number, number]> = {};
  let position = 0;

  for (const name of names) {
    const source = readFileSync(join(pkgRoot, name, "index.mjs"), "utf8");
    const { svg, aliases } = parseIconModule(source, { name });

    const indexAliases = upstream.iconAliases?.[name];
    const keywords = indexAliases
      ? indexAliases
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean)
      : aliases;

    icons.push({ name, category: categoryOf.get(name) ?? null, keywords });

    const buffer = Buffer.from(svg, "utf8");
    offsets[name] = [position, buffer.length];
    chunks.push(buffer);
    position += buffer.length;
  }

  // Drift guard: upstream publishes near-daily, so a shape change is the
  // realistic failure. Better to fail loudly than install a truncated set.
  if (typeof upstream.totalIcons === "number" && icons.length !== upstream.totalIcons) {
    throw new Error(`Parsed ${icons.length} icons but the package declares ${upstream.totalIcons}`);
  }
  if (icons.length === 0) throw new Error("No icons parsed");

  const parsed = /^(round|square)-(filled|outlined)-radius-([0-3])-stroke-(1|1\.5|2)$/.exec(style);
  if (!parsed) throw new Error(`Unrecognized style id: ${style}`);

  const categories = [...new Set(icons.map((i) => i.category).filter((c): c is string => Boolean(c)))].sort();

  return {
    index: JSON.stringify({
      style,
      version,
      axes: {
        join: parsed[1],
        fill: parsed[2],
        radius: Number(parsed[3]),
        stroke: parsed[4],
      },
      totalIcons: icons.length,
      categories,
      icons,
      offsets,
    }),
    blob: Buffer.concat(chunks),
    totalIcons: icons.length,
  };
}

/**
 * Delete staging and retired directories left behind by a killed install.
 *
 * The `finally` block in `writeAtomically` cleans up after a thrown error, but
 * it cannot run when the process dies outright — a Raycast memory kill, a quit
 * mid-install, a crash. Those leftovers are inert (readers skip them by prefix)
 * but they are ~5 MB each and nothing else would ever reclaim them.
 *
 * Sweeping here rather than on a timer or at launch keeps it to the one moment
 * we already hold the directory and are about to write to it anyway.
 *
 * **Liveness is decided by an owner file, not by age.** `mkdtemp` names are
 * unpredictable, so a sweep cannot otherwise tell its own scratch space from
 * that of an install running right now in another Raycast command — and
 * deleting a live one mid-write would corrupt the very operation this exists to
 * protect. Each staging directory therefore records the pid that created it,
 * and a directory is swept only once that process is gone. An age gate alone
 * got this wrong in both directions: it spared dead leftovers for an hour, and
 * after that hour it would happily delete a slow-but-living writer's data.
 *
 * The age gate survives only as a fallback for entries with no readable owner
 * (a pre-existing leftover, or one whose owner file never landed).
 */
const ORPHAN_AGE_MS = 60 * 60 * 1000;
const OWNER_FILE = ".owner";

/**
 * How long a directory claimed by a *living* pid may sit untouched before it is
 * treated as a leftover anyway.
 *
 * Liveness alone has no expiry, which leaves one unbounded path: if a killed
 * installer's pid is later recycled by some unrelated long-running process, the
 * probe reports "alive" forever and the directory is pinned for good.
 *
 * Staleness resolves it, but only because the owner file is a **heartbeat**:
 * `touchOwner` rewrites it around every slow step, so its mtime tracks the
 * writer's actual progress rather than when the directory happened to be
 * created. Measuring the directory's own mtime instead was subtly wrong — a
 * single long write inside it does not refresh it, so an install stalled on a
 * slow volume (a Windows redirected profile on a remote share, say) could be
 * classified stale and deleted while still running. A recycled pid, by
 * contrast, produces no heartbeat at all.
 */
const REUSED_PID_STALE_MS = 24 * 60 * 60 * 1000;

/**
 * Refresh a staging directory's heartbeat.
 *
 * Rewrites the owner file so both it and its parent directory get a current
 * mtime. Called around each slow step, so a live writer can never look stale no
 * matter how long an individual operation takes. Failures are ignored: a missed
 * heartbeat only risks a sweep a day later, while throwing here would fail an
 * install that is otherwise fine.
 */
/**
 * Retire a staging directory that is claimed but has shown no progress for a
 * day, without deleting it.
 *
 * This is the pid-reuse escape hatch. If a killed installer's pid is recycled
 * by an unrelated long-lived process, the liveness probe reports "alive"
 * forever and nothing would ever reclaim the directory. But liveness can't be
 * *disbelieved* either — the owner may genuinely be alive and blocked inside a
 * single slow write, in which case deleting its data is exactly the corruption
 * this module exists to prevent.
 *
 * Renaming resolves the standoff without choosing between them. Moving the
 * directory out of the `.staging-` namespace means later sweeps stop treating
 * it as claimed, so it ages out through the ordinary unowned path — while the
 * data itself stays on disk. If the owner really was alive, its publish rename
 * fails and it reports an error instead of silently losing work.
 */
function quarantine(dir: string, entry: string): void {
  // The new name must NOT contain `.staging-`, or the next sweep classifies it
  // as a claimed staging directory again and the quarantine achieves nothing.
  // `.abandoned-` is its own namespace: skipped by readers, matched by neither
  // branch of the sweep, and reclaimed by the unowned age path.
  const renamed = `${entry.replace(".staging-", ".abandoned-")}`;
  try {
    renameSync(join(dir, entry), join(dir, renamed));
  } catch {
    // Racing another sweep, or locked. It will be retried.
  }
}

/**
 * When a staging directory's owner last showed a sign of life.
 *
 * The owner file's mtime, falling back to the directory's when it cannot be
 * read — a missing or locked owner file should never look infinitely idle.
 */
function heartbeatMs(owner: string, fallback: string): number {
  try {
    return statSync(join(owner, OWNER_FILE)).mtimeMs;
  } catch {
    try {
      return statSync(fallback).mtimeMs;
    } catch {
      return Date.now();
    }
  }
}

function touchOwner(staging: string): void {
  try {
    writeFileSync(join(staging, OWNER_FILE), String(process.pid));
  } catch {
    // Best effort; see above.
  }
}

/**
 * What a staging directory's owner file says about its creator.
 *
 * Three states, not two. Collapsing `unknown` into `dead` is a data-loss bug:
 * the owner file is written by another process and can be read while that write
 * is still in flight (or while Windows holds a share lock on it), so "I could
 * not read a pid" is emphatically not "the writer is gone". `unknown` falls
 * through to the age gate, which spares anything recent.
 */
type OwnerState = "alive" | "dead" | "unknown";

function ownerState(target: string): OwnerState {
  const owner = join(target, OWNER_FILE);
  if (!existsSync(owner)) return "unknown";

  let raw: string;
  try {
    raw = readFileSync(owner, "utf8").trim();
  } catch {
    // Locked, or unreadable for any other reason — tells us nothing about the
    // writer, so do not treat it as permission to delete.
    return "unknown";
  }

  // An empty or partial read means we caught the file mid-write.
  if (raw.length === 0) return "unknown";

  const pid = Number(raw);
  if (!Number.isInteger(pid) || pid <= 0) return "unknown";
  if (pid === process.pid) return "alive";

  try {
    // Signal 0 performs the permission and existence checks without delivering
    // anything — the standard liveness probe.
    process.kill(pid, 0);
    return "alive";
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    // EPERM means the process exists but belongs to another user; still alive.
    if (code === "EPERM") return "alive";
    // ESRCH is a definitive "no such process". Anything else is inconclusive,
    // so fall back to age rather than deleting on a guess.
    return code === "ESRCH" ? "dead" : "unknown";
  }
}

function sweepOrphans(dir: string): void {
  let entries: string[];
  try {
    entries = readdirSync(dir);
  } catch {
    return;
  }

  const now = Date.now();
  for (const entry of entries) {
    // Order matters: a retired directory is named after the staging directory
    // that displaced it, so its name CONTAINS ".staging-" too. Testing for
    // staging first misclassified every retired copy, which sent it down the
    // liveness branch and past `adoptRetired` — the recovery path never ran.
    const retired = entry.includes(".retired-");
    const staging = !retired && entry.includes(".staging-");
    // Quarantined directories (see `quarantine`) carry no ownership claim, so
    // they fall through both branches below and are reclaimed purely by age.
    const abandoned = !retired && !staging && entry.includes(".abandoned-");
    if (!staging && !retired && !abandoned) continue;
    const target = join(dir, entry);

    try {
      // Liveness governs BOTH kinds. A retired directory belongs to the
      // transaction that displaced it and is that transaction's rollback
      // target, so deleting it while its owner still runs destroys the
      // recovery path — a strictly worse outcome than the adoption race, since
      // nothing is left to recover from.
      const owner = staging ? target : owningStagingOf(dir, entry);
      const state = owner ? ownerState(owner) : "unknown";
      const age = now - statSync(target).mtimeMs;
      // Staleness is measured from the HEARTBEAT, not the directory. A single
      // long write inside a directory does not update that directory's mtime,
      // so on a slow volume a running install could look untouched for hours.
      // `touchOwner` rewrites the owner file around each slow step, so this
      // tracks the writer's real progress. Falls back to the directory's own
      // age when there is no owner file to read.
      const idle = owner ? now - heartbeatMs(owner, target) : age;

      if (staging) {
        // A living owner means the directory is in use. An earlier version
        // bounded this by the one-hour orphan gate, which inverted the
        // priority: it deleted the in-flight data of a demonstrably running
        // process (verified: an alive owner on a 3-hour-old directory was
        // swept) to hedge against a reused pid, a rarer and far cheaper event.
        //
        // The only bound now is staleness, a day out — long past any real
        // install, and the sole way a directory pinned by a *recycled* pid ever
        // gets reclaimed. A live install rewrites its staging directory
        // constantly, so it can never look stale.
        //
        // **A living owner is never deleted, at any age.** The heartbeat only
        // updates between writes, never during one, so an install blocked
        // inside a single `writeFileSync` on a slow volume looks idle while
        // being entirely alive — and deleting it would destroy in-flight data
        // belonging to a running process. Staleness therefore cannot authorize
        // deletion here; it only authorizes *quarantine* (below), which is
        // reversible and destroys nothing.
        if (state === "alive") {
          if (idle >= REUSED_PID_STALE_MS) quarantine(dir, entry);
          continue;
        }
        // Unknown ownership is NOT permission to delete — an owner file caught
        // mid-write reads as unknown, and its writer is very much alive. Only
        // age can retire these.
        if (state === "unknown" && age < ORPHAN_AGE_MS) continue;
        // Anything left is either definitively dead, or unknown and old enough
        // that no in-flight install could still own it.
      } else if (abandoned) {
        // No owner to consult — it was quarantined precisely because its claim
        // could not be trusted. Age alone retires it.
        if (age < ORPHAN_AGE_MS) continue;
      } else if (owner && state !== "dead") {
        // A retired copy whose owning transaction is still running is that
        // transaction's rollback target. Liveness alone decides here, with NO
        // age backstop: the retired directory carries the mtime of the data it
        // holds, which may be days old, while its owner started seconds ago.
        // Letting age win would delete the rollback target of a live install —
        // the one thing that must survive for recovery to be possible.
        //
        // Pid reuse is not a concern in this branch: the staging directory must
        // ALSO still exist for `owner` to be non-null, and a finished
        // transaction removes it.
        continue;
      }
      if (adoptRetired(dir, entry)) continue;
      rmSync(target, { recursive: true, force: true });
    } catch {
      // Already gone, or racing another sweep. The next install retries.
    }
  }
}

/**
 * The staging directory a retired copy was displaced by, if it still exists.
 *
 * Retired directories are named `<style>.retired-<staging-basename>`, so the
 * transaction that owns them is recoverable from the name alone. Returns null
 * when the name doesn't parse or that staging directory is gone — in which case
 * the transaction is over and the retired copy is fair game.
 */
function owningStagingOf(dir: string, entry: string): string | null {
  const marker = entry.indexOf(".retired-");
  if (marker <= 0) return null;
  const owning = join(dir, entry.slice(marker + ".retired-".length));
  return existsSync(owning) ? owning : null;
}

/**
 * Reinstate a retired copy whose style has no live install.
 *
 * `writeAtomically` rolls a retired copy back when the publish rename fails,
 * but that rollback is itself a rename and can fail too — a locked directory, a
 * disk that filled between the two calls. The data then survives on disk under
 * `.retired-` while the extension reports the style as not installed, and the
 * sweep above would eventually delete the user's only copy.
 *
 * So before deleting anything, check whether it is a complete pair for a style
 * that currently has none, and if so move it back. Deliberately conservative:
 * it never overwrites a live install, and a directory missing either file is
 * treated as junk. Returns true when the entry was adopted (and must not be
 * deleted).
 *
 * **Never adopts from a transaction still in flight.** A retired directory is
 * named for the staging directory that displaced it, so its owner is knowable:
 * while that staging directory exists and its process lives, the style is
 * legitimately absent mid-swap and this copy is that process's rollback target.
 * Stealing it would break the very recovery path it exists to serve.
 */
function adoptRetired(dir: string, entry: string): boolean {
  const marker = entry.indexOf(".retired-");
  if (marker <= 0) return false;

  const style = entry.slice(0, marker);
  const final = join(dir, style);
  if (existsSync(final)) return false;

  const owningStaging = owningStagingOf(dir, entry);
  if (owningStaging && ownerState(owningStaging) !== "dead") return false;

  const source = join(dir, entry);
  if (!existsSync(join(source, "index.json")) || !existsSync(join(source, "geometry.svg"))) return false;

  try {
    renameSync(source, final);
    return true;
  } catch {
    // Leave it in place rather than deleting it — a later sweep can retry, and
    // an unreadable copy still beats no copy.
    return true;
  }
}

/**
 * Publish a style's index and geometry as one indivisible unit.
 *
 * **Why a staging directory rather than two renames.** An index's byte offsets
 * are only meaningful for the exact blob it was written with, so the two files
 * have to become visible together. Renaming them one after the other cannot do
 * that: a process killed between the two calls leaves the old index paired with
 * the new blob, and every read then lands at the wrong byte range — silently
 * wrong output rather than a clean failure.
 *
 * Both files are therefore written into a sibling staging directory and moved
 * with a *single* rename. A reader either sees the previous complete pair or
 * the new complete pair, never a mixture. Staging sits inside `dataDir()` so
 * the rename stays within one filesystem, which is what makes it atomic.
 *
 * The previous copy is swapped out and deleted only after the new one is in
 * place, so an interruption at any point leaves a working install behind.
 */
function writeAtomically(style: string, built: BuiltStyle): void {
  const dir = dataDir();
  mkdirSync(dir, { recursive: true });
  sweepOrphans(dir);

  const final = join(dir, style);
  // Unique per call for the same reason as the work directory: concurrent
  // installs of one style must not share staging paths.
  const staging = mkdtempSync(`${final}.staging-`);
  const retired = `${final}.retired-${basename(staging)}`;

  let retiredHoldsTheOnlyCopy = false;

  try {
    // Claim ownership before writing anything, so a concurrent sweep can see
    // this directory is live from the first moment it is visible.
    writeFileSync(join(staging, OWNER_FILE), String(process.pid));

    // Heartbeat between the two writes. The geometry is the large one (~4 MB)
    // and on a slow volume can take long enough that the directory would
    // otherwise look untouched; refreshing here keeps a live install from ever
    // being classified stale, however slow the filesystem.
    writeFileSync(join(staging, "geometry.svg"), built.blob);
    touchOwner(staging);
    writeFileSync(join(staging, "index.json"), built.index);
    touchOwner(staging);

    // Drop the claim before publishing: once renamed, this directory IS the
    // installed style and must contain only the two data files.
    rmSync(join(staging, OWNER_FILE), { force: true });

    // Move any existing install aside first: rename onto a populated directory
    // fails on most platforms, so the swap has to be two steps. The window
    // between them is the only moment a style is absent, and it contains no
    // I/O — a reader that hits it sees "not installed", never a broken pair.
    if (existsSync(final)) {
      renameSync(final, retired);
      retiredHoldsTheOnlyCopy = true;
    }

    try {
      renameSync(staging, final);
    } catch (error) {
      // The publish failed with the previous copy already moved aside, so
      // `final` is now absent and `retired` holds the user's only working
      // data. Put it back before rethrowing: a failed *upgrade* must leave the
      // user on the old version, never with nothing. (Without this the
      // `finally` below deleted `retired` and the style vanished entirely —
      // found by review, reproduced with an injected rename failure.)
      renameSync(retired, final);
      retiredHoldsTheOnlyCopy = false;
      throw error;
    }

    // Only now is the new copy definitively in place, so the old one is safe
    // to drop.
    retiredHoldsTheOnlyCopy = false;
  } finally {
    rmSync(staging, { recursive: true, force: true });
    // Never delete `retired` while it is the only surviving copy — the flag is
    // cleared only once the data is either restored or superseded.
    if (!retiredHoldsTheOnlyCopy) rmSync(retired, { recursive: true, force: true });
  }
}

/**
 * Remove an installed style's data.
 *
 * Invalidates the manifest caches afterwards: `loadIndex` memoizes successful
 * reads and `blobHandles` keeps file descriptors open, so without this a style
 * that had been loaded would keep serving from cache after its files are gone.
 */
export function uninstallStyle(style: string): void {
  rmSync(join(dataDir(), style), { recursive: true, force: true });
  invalidateManifests();
}
