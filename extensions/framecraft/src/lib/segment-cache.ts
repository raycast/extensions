import { createHash, randomUUID } from "node:crypto";
import { execFileSync } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import { runCommand } from "./command-runner";

const MAX_CACHE_BYTES = 4096 * 1024 * 1024;
// ffmpeg may finish its current packet after -fs; reserve headroom for admission.
export const MAX_SEGMENT_BYTES = 2048 * 1024 * 1024;
const TTL_MS = 10 * 60 * 1000;
export interface SegmentSubtitleLanguage {
  pid: number;
  language: string;
}
interface Manifest {
  subtitleLanguages?: SegmentSubtitleLanguage[];
  version: 1;
  key: string;
  extension: ".ts" | ".mkv";
  bytes: number;
  createdAt: number;
  accessedAt: number;
  firstPts: number;
  lastPts: number;
  sourceOffset: number;
  titleStart: number;
  titleEnd: number;
}
export interface SegmentLease {
  subtitleLanguages?: SegmentSubtitleLanguage[];
  mediaPath: string;
  targetSec: number;
  coarseSec: number;
  release(): Promise<void>;
}

/** Only the digest is persisted. Stable Jellyfin IDs supersede expiring playback URLs. */
export function segmentCacheKey(identity: {
  server: string;
  source: string;
  mediaSourceId?: string;
  itemId?: string;
  url: string;
  playlist?: number;
  disc: boolean;
}): string {
  const stable = {
    server: identity.server.replace(/\/+$/, ""),
    source: identity.source,
    itemId: identity.itemId || undefined,
    mediaSourceId: identity.mediaSourceId || undefined,
    url: identity.itemId || identity.mediaSourceId ? undefined : identity.url,
    playlist: identity.playlist,
    disc: identity.disc,
    // Bump when the title→source clock mapping changes so stale offsets are never reused.
    clock: "container-start-v2",
  };
  return createHash("sha256").update(JSON.stringify(stable)).digest("hex");
}
function alive(pid: number): boolean {
  if (!Number.isSafeInteger(pid) || pid <= 0) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    return (error as NodeJS.ErrnoException).code !== "ESRCH";
  }
}

// shlock atomically claims a PID lock and recovers locks from dead processes.
// Serialize local callers too: shlock intentionally treats the same PID as owner.
let localTail: Promise<void> = Promise.resolve();
async function locked<T>(root: string, action: () => Promise<T>): Promise<T> {
  const previous = localTail;
  let unlock!: () => void;
  localTail = new Promise<void>((resolve) => {
    unlock = resolve;
  });
  await previous;
  const lock = path.join(root, ".lock");
  let acquired = false;
  try {
    await fs.mkdir(root, { recursive: true, mode: 0o700 });
    const deadline = Date.now() + 10000;
    while (!acquired) {
      try {
        execFileSync("/usr/bin/shlock", ["-f", lock, "-p", String(process.pid)], { stdio: "ignore" });
        acquired = true;
      } catch {
        if (Date.now() >= deadline) throw new Error("Local segment cache is busy.");
        await new Promise((resolve) => setTimeout(resolve, 40));
      }
    }
    return await action();
  } finally {
    try {
      if (acquired) await fs.rm(lock, { force: true });
    } finally {
      unlock();
    }
  }
}

export class SegmentCache {
  private readonly root: string;
  constructor(supportPath: string) {
    this.root = path.join(supportPath, "segment-cache-v1");
  }

  private async entries(): Promise<Array<{ id: string; manifest: Manifest; pinned: boolean }>> {
    const entries: Array<{ id: string; manifest: Manifest; pinned: boolean }> = [];
    for (const id of await fs.readdir(this.root)) {
      if (!/^[a-f0-9]{32}$/.test(id)) continue;
      const dir = path.join(this.root, id);
      let pinned = false;
      for (const name of await fs.readdir(dir)) {
        const match = /^pin-(\d+)-/.exec(name);
        if (!match) continue;
        if (alive(Number(match[1]))) pinned = true;
        else await fs.rm(path.join(dir, name), { force: true });
      }
      try {
        const m = JSON.parse(await fs.readFile(path.join(dir, "manifest.json"), "utf8")) as Manifest;
        const stat = await fs.stat(path.join(dir, `media${m.extension}`));
        if (
          m.version !== 1 ||
          !/^[a-f0-9]{64}$/.test(m.key) ||
          ![".ts", ".mkv"].includes(m.extension) ||
          ![m.bytes, m.createdAt, m.accessedAt, m.firstPts, m.lastPts, m.sourceOffset, m.titleStart, m.titleEnd].every(
            Number.isFinite,
          ) ||
          !stat.isFile() ||
          stat.size !== m.bytes ||
          m.bytes <= 0 ||
          m.bytes > MAX_CACHE_BYTES ||
          m.firstPts >= m.lastPts ||
          m.titleStart >= m.titleEnd
        )
          throw new Error("Invalid cache manifest");
        if (Date.now() - m.createdAt >= TTL_MS && !pinned) await fs.rm(dir, { recursive: true, force: true });
        else entries.push({ id, manifest: m, pinned });
      } catch {
        if (!pinned) await fs.rm(dir, { recursive: true, force: true });
      }
    }
    let total = entries.reduce((sum, entry) => sum + entry.manifest.bytes, 0);
    for (const entry of entries
      .filter((e) => !e.pinned)
      .sort((a, b) => a.manifest.accessedAt - b.manifest.accessedAt)) {
      if (total <= MAX_CACHE_BYTES) break;
      await fs.rm(path.join(this.root, entry.id), { recursive: true, force: true });
      total -= entry.manifest.bytes;
      entries.splice(entries.indexOf(entry), 1);
    }
    return entries;
  }

  private async pin(id: string, manifest: Manifest, titleTarget: number): Promise<SegmentLease> {
    const dir = path.join(this.root, id);
    const pin = path.join(dir, `pin-${process.pid}-${randomUUID()}`);
    await fs.writeFile(pin, "", { flag: "wx" });
    manifest.accessedAt = Date.now();
    // Atomic metadata replacement: interrupted writes never publish a partial manifest.
    const temporary = path.join(dir, "manifest.tmp");
    await fs.writeFile(temporary, JSON.stringify(manifest));
    await fs.rename(temporary, path.join(dir, "manifest.json"));
    let released = false;
    return {
      subtitleLanguages: manifest.subtitleLanguages,
      mediaPath: path.join(dir, `media${manifest.extension}`),
      targetSec: titleTarget + manifest.sourceOffset,
      coarseSec: Math.max(manifest.firstPts, titleTarget + manifest.sourceOffset - 8),
      release: async () => {
        if (released) return;
        await locked(this.root, async () => {
          await fs.rm(pin, { force: true });
          await this.entries();
        });
        released = true;
      },
    };
  }

  async prune(): Promise<void> {
    await locked(this.root, async () => {
      await this.entries();
    });
  }

  async clearUnused(): Promise<number> {
    return locked(this.root, async () => {
      const before = (await fs.readdir(this.root)).filter((id) => /^[a-f0-9]{32}$/.test(id));
      let beforeBytes = 0;
      for (const id of before)
        for (const extension of [".ts", ".mkv"]) {
          try {
            beforeBytes += (await fs.stat(path.join(this.root, id, `media${extension}`))).size;
          } catch {
            /* Other format or gone. */
          }
        }
      const entries = await this.entries();
      let freed = beforeBytes - entries.reduce((sum, entry) => sum + entry.manifest.bytes, 0);
      for (const entry of entries)
        if (!entry.pinned) {
          await fs.rm(path.join(this.root, entry.id), { recursive: true, force: true });
          freed += entry.manifest.bytes;
        }
      return freed;
    });
  }

  async find(key: string, titleTarget: number): Promise<SegmentLease | undefined> {
    return locked(this.root, async () => {
      const entries = await this.entries();
      const hit = entries
        .filter(
          ({ manifest: m }) =>
            m.key === key &&
            Date.now() - m.createdAt < TTL_MS &&
            m.titleStart <= Math.max(0, titleTarget - 8) &&
            m.titleEnd >= titleTarget + 1,
        )
        .sort((a, b) => b.manifest.accessedAt - a.manifest.accessedAt)[0];
      return hit ? this.pin(hit.id, hit.manifest, titleTarget) : undefined;
    });
  }

  /** Decode the small fragment to measure actual video bounds, not container duration/subtitle tails.
   * titleStart/titleEnd must stay within the one ISO playitem whose linear mapping is known.
   */
  async store(input: {
    key: string;
    mediaPath: string;
    titleTarget: number;
    sourceTarget: number;
    ffprobePath: string;
    env?: NodeJS.ProcessEnv;
    titleStart?: number;
    titleEnd?: number;
    subtitleLanguages?: SegmentSubtitleLanguage[];
    timeoutMs?: number;
  }): Promise<SegmentLease | undefined> {
    const stat = await fs.stat(input.mediaPath);
    if (!stat.isFile() || stat.size <= 0 || stat.size > MAX_CACHE_BYTES) return undefined;
    const { stdout } = await runCommand(
      input.ffprobePath,
      [
        "-v",
        "error",
        "-select_streams",
        "v:0",
        "-show_packets",
        "-show_entries",
        "packet=pts_time",
        "-of",
        "json",
        input.mediaPath,
      ],
      { env: input.env, timeout: input.timeoutMs ?? 90000, maxBuffer: 32 * 1024 * 1024 },
    );
    const packets = JSON.parse(stdout).packets as Array<{ pts_time?: string }>;
    const pts = (packets ?? []).map((packet) => Number(packet.pts_time)).filter(Number.isFinite);
    if (pts.length < 2) return undefined;
    const firstPts = pts.reduce((a, b) => Math.min(a, b), Infinity);
    const lastPts = pts.reduce((a, b) => Math.max(a, b), -Infinity);
    const sourceOffset = input.sourceTarget - input.titleTarget;
    if (
      !Number.isFinite(sourceOffset) ||
      firstPts > Math.max(0, input.titleTarget - 8) + sourceOffset ||
      lastPts < input.sourceTarget + 1 ||
      lastPts - firstPts > 120
    )
      return undefined;
    const subtitleLanguages = input.subtitleLanguages
      ?.filter(
        (entry) =>
          Number.isInteger(entry.pid) && entry.pid >= 0 && entry.pid <= 8191 && /^[A-Za-z]{2,3}$/.test(entry.language),
      )
      .slice(0, 128);
    const manifest: Manifest = {
      subtitleLanguages,
      version: 1,
      key: input.key,
      extension: path.extname(input.mediaPath) === ".ts" ? ".ts" : ".mkv",
      bytes: stat.size,
      createdAt: Date.now(),
      accessedAt: Date.now(),
      firstPts,
      lastPts,
      sourceOffset,
      titleStart: Math.max(firstPts - sourceOffset, input.titleStart ?? 0),
      titleEnd: Math.min(lastPts - sourceOffset, input.titleEnd ?? Infinity),
    };
    return locked(this.root, async () => {
      const entries = await this.entries();
      let bytes = entries.reduce((sum, entry) => sum + entry.manifest.bytes, 0);
      for (const entry of entries
        .filter((e) => !e.pinned)
        .sort((a, b) => a.manifest.accessedAt - b.manifest.accessedAt)) {
        if (bytes + stat.size <= MAX_CACHE_BYTES) break;
        await fs.rm(path.join(this.root, entry.id), { recursive: true, force: true });
        bytes -= entry.manifest.bytes;
      }
      if (bytes + stat.size > MAX_CACHE_BYTES) return undefined;
      const id = randomUUID().replace(/-/g, "");
      const dir = path.join(this.root, id);
      await fs.mkdir(dir, { mode: 0o700 });
      try {
        // Same support filesystem: transfer ownership without temporarily doubling disk use.
        await fs.rename(input.mediaPath, path.join(dir, `media${manifest.extension}`));
        await fs.writeFile(path.join(dir, "manifest.json"), JSON.stringify(manifest));
        return await this.pin(id, manifest, input.titleTarget);
      } catch (error) {
        // Restore the caller's temporary fragment if publication fails.
        await fs.rename(path.join(dir, `media${manifest.extension}`), input.mediaPath).catch(() => undefined);
        await fs.rm(dir, { recursive: true, force: true });
        throw error;
      }
    });
  }
}
