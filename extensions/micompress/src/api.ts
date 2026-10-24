import { createWriteStream, existsSync, openAsBlob, statSync } from "fs";
import { unlink } from "fs/promises";
import { basename, dirname, join, extname } from "path";
import { Readable } from "stream";
import { pipeline } from "stream/promises";
import type { ReadableStream as WebReadableStream } from "stream/web";
import { categoryFor, endpointPath, extOf } from "./categories";

const BASE = "https://micompress.com";
const UA = "micompress-raycast/1.0.0 (+https://micompress.com)";
export const SITE = `${BASE}/?utm_source=raycast&utm_medium=extension&utm_campaign=extend`;

// The public API sits behind Cloudflare, which rejects request bodies over 100 MB.
const MAX_UPLOAD_BYTES = 100 * 1024 * 1024;

export interface Meta {
  inputSize: number;
  outputSize: number;
  savedBytes: number;
  savedPercent: number;
  format: string;
}

/** First "<name>-min<ext>", "<name>-min-2<ext>", … that does not exist yet. */
function freeOutputPath(input: string): string {
  const ext = extname(input);
  const stem = join(dirname(input), basename(input, ext));
  let candidate = `${stem}-min${ext}`;
  for (let i = 2; existsSync(candidate); i++) candidate = `${stem}-min-${i}${ext}`;
  return candidate;
}

export async function compressFile(input: string, preset: string): Promise<{ dest: string; meta: Meta }> {
  const filename = basename(input);
  const category = categoryFor(filename);
  if (!category) throw new Error(`Unsupported file type ".${extOf(filename) || "?"}"`);
  if (statSync(input).size > MAX_UPLOAD_BYTES) {
    throw new Error("Larger than 100 MB — compress it on micompress.com instead");
  }

  // openAsBlob streams the file from disk instead of holding it in memory.
  const form = new FormData();
  form.append("file", await openAsBlob(input), filename);
  form.append("preset", preset);

  const res = await fetch(`${BASE}/${endpointPath(category)}/compress`, {
    method: "POST",
    body: form,
    headers: { Accept: "application/json", "User-Agent": UA },
  });
  let json: Meta & { success?: boolean; error?: string; downloadUrl?: string };
  try {
    json = (await res.json()) as typeof json;
  } catch {
    throw new Error(`Unexpected response (HTTP ${res.status})`);
  }
  if (!json.success || !json.downloadUrl) throw new Error(json.error || `HTTP ${res.status}`);

  const dl = await fetch(BASE + json.downloadUrl, { headers: { "User-Agent": UA } });
  if (!dl.ok || !dl.body) throw new Error(`Download failed (HTTP ${dl.status})`);

  // "wx" refuses to overwrite: an existing file (possibly another selected original) is never replaced.
  const dest = freeOutputPath(input);
  try {
    await pipeline(Readable.fromWeb(dl.body as WebReadableStream), createWriteStream(dest, { flags: "wx" }));
  } catch (e) {
    if (!(e instanceof Error && "code" in e && e.code === "EEXIST")) await unlink(dest).catch(() => undefined);
    throw e;
  }
  return { dest, meta: json };
}
