import { createHash } from "node:crypto";
import {
  mkdir,
  readdir,
  stat,
  unlink,
  utimes,
  writeFile,
  rename,
} from "node:fs/promises";
import { join } from "node:path";
import type { PreviewSpec } from "./preview.ts";
import { withCacheLock } from "./cache-lock.ts";
import { encodeRetinaPreview } from "./retina-preview.ts";

export const MAX_FILES = 200,
  MAX_BYTES = 20 * 1024 * 1024;
// Version invalidates previously rendered pixels when the rasterizer changes.
export function previewKey(spec: PreviewSpec) {
  return createHash("sha256")
    .update(
      JSON.stringify([
        13,
        spec.easing,
        spec.duration,
        spec.component,
        spec.appearance,
      ]),
    )
    .digest("hex");
}
export class PreviewCache {
  private files = 0;
  private bytes = 0;
  private activePath?: string;
  private latestPath?: string;
  private queue: Promise<unknown> = Promise.resolve();
  private inFlight = new Map<
    string,
    Promise<{ path: string; cached: boolean; milliseconds: number }>
  >();
  private ready: Promise<void>;
  private initialized = false;
  private directory: string;
  private assetDirectory: string;
  constructor(
    directory: string,
    assetDirectory = join(process.cwd(), "assets"),
  ) {
    this.directory = directory;
    this.assetDirectory = assetDirectory;
    this.ready = mkdir(directory, { recursive: true }).then(() => {});
    // Retain the rejection for get(), but don't emit an unhandled rejection if
    // the user only converts text and never requests an animated preview.
    void this.ready.catch(() => {});
  }
  private async startup() {
    await mkdir(this.directory, { recursive: true });
    const entries = [];
    for (const name of await readdir(this.directory)) {
      if (!/^[a-f0-9]{64}\.gif$/.test(name)) continue;
      const path = join(this.directory, name),
        info = await stat(path);
      if (info.isFile())
        entries.push({ path, size: info.size, used: info.mtimeMs });
    }
    entries.sort((a, b) => a.used - b.used);
    this.files = entries.length;
    this.bytes = entries.reduce((sum, entry) => sum + entry.size, 0);
    // Originally startup-only: native QA showed a full cache stranded users on
    // a poster until reopening. Also reclaim on admission, protecting live GIFs.
    while (this.files > MAX_FILES - 1 || this.bytes > MAX_BYTES - 1024 * 1024) {
      const oldest = entries.shift();
      if (!oldest) break;
      await unlink(oldest.path);
      this.files--;
      this.bytes -= oldest.size;
    }
  }
  setActive(path: string) {
    this.activePath = path;
  }
  get(spec: PreviewSpec) {
    const key = previewKey(spec);
    const existing = this.inFlight.get(key);
    if (existing) return existing;
    // Serialize admission and writes so simultaneous requests cannot overbook
    // the byte/file limits. Duplicate curves still share their in-flight job.
    const job = this.queue.then(async () => {
      await this.ready;
      return withCacheLock(this.directory, async () => {
        if (!this.initialized) {
          await this.startup();
          this.initialized = true;
        }
        return this.generate(key, spec);
      });
    });
    this.queue = job.catch(() => {});
    this.inFlight.set(key, job);
    void job.finally(() => this.inFlight.delete(key)).catch(() => {});
    return job;
  }
  private async makeRoom(requiredBytes: number) {
    if (requiredBytes > MAX_BYTES)
      throw new Error("This preview exceeds the 20 MiB cache limit.");
    this.files = 0;
    this.bytes = 0;
    const candidates = [];
    for (const name of await readdir(this.directory)) {
      if (!/^[a-f0-9]{64}\.gif$/.test(name)) continue;
      const path = join(this.directory, name);
      // Protect the displayed image and the latest delivery while React is
      // committing it. Only generated cache GIFs can ever be removed here.
      const info = await stat(path);
      if (info.isFile()) {
        this.files++;
        this.bytes += info.size;
        if (path === this.activePath || path === this.latestPath) continue;
        candidates.push({ path, size: info.size, used: info.mtimeMs });
      }
    }
    candidates.sort((a, b) => a.used - b.used);
    for (const entry of candidates) {
      if (this.files < MAX_FILES && this.bytes + requiredBytes <= MAX_BYTES)
        break;
      await unlink(entry.path);
      this.files--;
      this.bytes -= entry.size;
    }
    if (this.files >= MAX_FILES || this.bytes + requiredBytes > MAX_BYTES)
      throw new Error(
        "Not enough cache space without removing the active preview.",
      );
  }
  private async generate(key: string, spec: PreviewSpec) {
    await this.ready;
    const start = performance.now(),
      path = join(this.directory, `${key}.gif`);
    try {
      await stat(path);
      const now = new Date();
      await utimes(path, now, now); // mtime deliberately records last use, not creation.
      this.latestPath = path;
      return { path, cached: true, milliseconds: performance.now() - start };
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    }
    const bytes = encodeRetinaPreview(spec, this.assetDirectory);
    await this.makeRoom(bytes.length);
    this.files++;
    this.bytes += bytes.length;
    const temporary = `${path}.tmp`;
    try {
      await writeFile(temporary, bytes);
      await rename(temporary, path);
      this.latestPath = path;
    } catch (error) {
      this.files--;
      this.bytes -= bytes.length;
      await unlink(temporary).catch(() => {});
      throw error;
    }
    return { path, cached: false, milliseconds: performance.now() - start };
  }
}
