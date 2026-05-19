import { execFile, spawn } from "node:child_process";
import { promisify } from "node:util";
import { mkdtemp, readdir, rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

const pExecFile = promisify(execFile);

export interface SynthesizedChunk {
  path: string;
  durationMs: number;
}

export interface SynthesizeOptions {
  voice?: string;
  wpm: number;
  dir: string;
  index: number;
}

export async function makeTempDir(): Promise<string> {
  return mkdtemp(path.join(tmpdir(), "rsvp-"));
}

export async function cleanupTempDir(dir: string): Promise<void> {
  await rm(dir, { recursive: true, force: true });
}

const ORPHAN_MAX_AGE_MS = 60 * 60 * 1000; // 1 hour

/**
 * Sweep orphaned rsvp-* temp directories left behind by crashes or hard kills.
 * Anything older than ORPHAN_MAX_AGE_MS is removed.
 */
export async function cleanupOrphans(): Promise<number> {
  try {
    const tmp = tmpdir();
    const entries = await readdir(tmp);
    const now = Date.now();
    const results = await Promise.all(
      entries
        .filter((e) => e.startsWith("rsvp-"))
        .map(async (e) => {
          const p = path.join(tmp, e);
          try {
            const s = await stat(p);
            if (now - s.mtimeMs > ORPHAN_MAX_AGE_MS) {
              await rm(p, { recursive: true, force: true });
              return 1;
            }
          } catch {
            /* ignore — already gone or permission denied */
          }
          return 0;
        }),
    );
    return results.reduce<number>((a, b) => a + b, 0);
  } catch {
    return 0;
  }
}

export async function synthesizeChunk(text: string, opts: SynthesizeOptions): Promise<SynthesizedChunk> {
  const file = path.join(opts.dir, `chunk-${opts.index}.aiff`);
  const args: string[] = [];
  if (opts.voice && opts.voice.trim()) args.push("-v", opts.voice.trim());
  args.push("-r", String(Math.round(opts.wpm)));
  args.push("-o", file);

  await new Promise<void>((resolve, reject) => {
    const p = spawn("say", args, { stdio: ["pipe", "ignore", "pipe"] });
    let err = "";
    p.stderr?.on("data", (d) => {
      err += d.toString();
    });
    p.on("error", reject);
    p.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`say synthesis failed (${code}): ${err.trim()}`));
    });
    p.stdin?.end(text);
  });

  const { stdout } = await pExecFile("afinfo", [file]);
  const m = stdout.match(/(?:estimated\s+)?duration:\s*([\d.]+)\s*sec/i);
  const durationMs = m ? Math.round(parseFloat(m[1]) * 1000) : 0;
  return { path: file, durationMs };
}
