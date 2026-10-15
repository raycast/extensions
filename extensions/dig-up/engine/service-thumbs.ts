// Pictures of results (DigUp: Previews.swift): the picture itself, the PDF page that matched with its words marked, the
// video frame at the moment, a waveform with the matched stretch lit, and Quick Look's picture of anything else (a
// document). Drawn by the helper, kept under paths.thumbs by what they depend on, so a preview opened again costs a
// file read.

import { createHash } from "node:crypto";
import { closeSync, mkdirSync, openSync, readSync, readdirSync, rmSync, statSync } from "node:fs";
import { join } from "node:path";
import type { ThumbRequest, ThumbResponse } from "./api";
import type { Helper, ThumbArgs } from "./helper";
import type { Log } from "./log";

/** Pictures kept at most; past it the oldest half goes (checked when the cache opens and every 200 pictures). */
const KEEP = 4000;
const DEFAULT_PIXELS = 600;

/** The size of a PNG or JPEG from its header, or null. */
export function imageSize(file: string): { width: number; height: number } | null {
  let fd: number;
  try {
    fd = openSync(file, "r");
  } catch {
    return null;
  }
  try {
    const head = Buffer.alloc(64 * 1024);
    const length = readSync(fd, head, 0, head.length, 0);
    const bytes = head.subarray(0, length);
    if (bytes.length >= 24 && bytes.readUInt32BE(0) === 0x89504e47) {
      return { width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20) };
    }
    if (bytes.length < 4 || bytes[0] !== 0xff || bytes[1] !== 0xd8) return null;
    // JPEG: walk the markers to the first start of frame.
    for (let at = 2; at + 9 < bytes.length;) {
      if (bytes[at] !== 0xff) return null;
      const marker = bytes[at + 1];
      if (marker === 0xff) {
        at++;
        continue;
      }
      const size = bytes.readUInt16BE(at + 2);
      const isFrame = marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc;
      if (isFrame) return { width: bytes.readUInt16BE(at + 7), height: bytes.readUInt16BE(at + 5) };
      at += 2 + size;
    }
    return null;
  } finally {
    closeSync(fd);
  }
}

/** What the helper is asked to draw for a result. */
export function thumbArgs(r: ThumbRequest, out: string): ThumbArgs {
  const args: ThumbArgs = {
    path: r.path,
    out,
    maxPixel: Math.max(16, Math.min(4096, Math.round(r.maxPixel ?? DEFAULT_PIXELS))),
  };
  const loc = r.loc ?? null;
  if (r.kind === "pdf") {
    args.page = Math.max(1, Math.trunc(loc ?? 1));
    if (r.words && r.words.length > 0) args.words = r.words;
  } else if (r.kind === "video" && loc !== null) {
    args.time = loc;
  } else if (r.kind === "audio" && loc !== null) {
    args.range = [loc, r.locEnd ?? loc + 30];
  }
  return args;
}

/** A picture being drawn, shared by the requests that want it; the last of them to go away cancels it. */
interface Drawing {
  promise: Promise<ThumbResponse>;
  controller: AbortController;
  waiters: number;
}

/** An error the daemon answers with its status (`statusOf`), not as a failure of its own. */
function refused(status: number, message: string): Error {
  return Object.assign(new Error(message), { status });
}

export class ThumbCache {
  private made = 0;
  private readonly inFlight = new Map<string, Drawing>();

  constructor(
    private readonly folder: string,
    private readonly helper: () => Pick<Helper, "thumb">,
    private readonly log: Log,
  ) {
    this.trim();
  }

  async thumb(r: ThumbRequest, signal?: AbortSignal): Promise<ThumbResponse> {
    signal?.throwIfAborted();
    let mtime: number;
    try {
      mtime = statSync(r.path).mtimeMs;
    } catch (error) {
      const code = (error as { code?: string }).code;
      // Gone since the search (or never there): a final answer, not an engine failure to try again.
      if (code === "ENOENT" || code === "ENOTDIR") throw refused(404, `${r.path} isn't there any more`);
      throw error;
    }
    // Text stays sharp in PNG; photos and frames are smaller as JPEG.
    const png =
      r.kind === "screenshot" || r.kind === "pdf" || r.kind === "audio" || r.kind === "doc" || r.kind === "code";
    const key = [r.path, mtime, r.kind, r.loc ?? "", r.locEnd ?? "", (r.words ?? []).join(" "), r.maxPixel ?? ""].join(
      "|",
    );
    const out = join(this.folder, createHash("sha1").update(key).digest("hex") + (png ? ".png" : ".jpg"));
    const cached = imageSize(out);
    if (cached) return { path: out, ...cached };
    let drawing = this.inFlight.get(out);
    if (!drawing || drawing.controller.signal.aborted) {
      const controller = new AbortController();
      const made: Drawing = { controller, waiters: 0, promise: this.draw(r, out, controller.signal) };
      made.promise = made.promise.finally(() => {
        if (this.inFlight.get(out) === made) this.inFlight.delete(out);
      });
      this.inFlight.set(out, made);
      drawing = made;
    }
    return this.wait(drawing, signal);
  }

  /** A request's share of a drawing. Arrowing through results leaves many behind: those still waiting for the helper
   *  are dropped, so the picture the user stops on doesn't wait behind them. */
  private wait(drawing: Drawing, signal?: AbortSignal): Promise<ThumbResponse> {
    drawing.waiters++;
    if (!signal) return drawing.promise;
    return new Promise<ThumbResponse>((resolve, reject) => {
      const leave = () => {
        if (--drawing.waiters === 0) drawing.controller.abort(signal.reason);
        reject(signal.reason);
      };
      signal.addEventListener("abort", leave, { once: true });
      drawing.promise.then(resolve, reject).finally(() => signal.removeEventListener("abort", leave));
    });
  }

  private async draw(r: ThumbRequest, out: string, signal: AbortSignal): Promise<ThumbResponse> {
    mkdirSync(this.folder, { recursive: true });
    const made = await this.helper().thumb(thumbArgs(r, out), { signal });
    if (++this.made % 200 === 0) this.trim();
    return { path: made.path, width: made.width, height: made.height };
  }

  /** Keeps the folder from growing without end: past KEEP pictures, the oldest half goes. */
  private trim(): void {
    try {
      const files = readdirSync(this.folder)
        .filter((name) => name.endsWith(".png") || name.endsWith(".jpg"))
        .map((name) => ({ name, at: statSync(join(this.folder, name)).mtimeMs }));
      if (files.length <= KEEP) return;
      files.sort((a, b) => a.at - b.at);
      for (const file of files.slice(0, files.length - KEEP / 2)) rmSync(join(this.folder, file.name), { force: true });
    } catch (error) {
      if ((error as { code?: string }).code !== "ENOENT") this.log.warn(`thumbs: ${(error as Error).message}`);
    }
  }
}
