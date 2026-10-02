import * as fs from "node:fs";
import { DEFAULT_IDLE_MS, runWithWatchdog } from "./run.js";
import { uniqueFilePath } from "./unique-path.js";

export type MonolithSaveOptions = {
  url: string;
  /** Full path of the .html file monolith will write. */
  outputPath: string;
  /** True selects Lightweight mode (`--no-js`). */
  noJavaScript: boolean;
  /** Idle-watchdog window in ms. Defaults to DEFAULT_IDLE_MS if omitted. */
  idleMs?: number;
  /** Aborting cancels the save mid-flight. */
  abortSignal?: AbortSignal;
};

/** Build monolith CLI args. monolith writes the self-contained HTML to `outputPath`. */
export function buildMonolithArgs(o: MonolithSaveOptions): string[] {
  const args = ["--output", o.outputPath];
  if (o.noJavaScript) args.push("--no-js");
  args.push(o.url);
  return args;
}

/**
 * Derive a filesystem-safe `.html` filename from a URL — its host, path, and
 * query string, with separators and unsafe characters replaced by "-". Falls
 * back to "webpage.html" for an unparseable URL.
 */
export function webpageFilename(url: string): string {
  let raw = "webpage";
  try {
    const hasProtocol = /^[a-z][a-z0-9+.-]*:\/\//i.test(url);
    const u = new URL(hasProtocol ? url : `https://${url}`);
    raw = `${u.hostname.replace(/^www\./, "")}${u.pathname}${u.search}`;
  } catch {
    // keep the "webpage" fallback
  }
  let safe = raw
    .replace(/[/\\?%*:|"<>=&\s]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^[-.]+|[-.]+$/g, "");
  if (safe.length > 150) {
    safe = safe.slice(0, 150).replace(/[-.]+$/g, "");
  }
  return `${safe || "webpage"}.html`;
}

/**
 * Where to save `url` in `folder`: its `webpageFilename`, numbered (`… (2).html`)
 * when that name is taken, so saving a page again never overwrites the earlier copy.
 */
export function webpageOutputPath(folder: string, url: string, exists: (p: string) => boolean = fs.existsSync): string {
  return uniqueFilePath(folder, webpageFilename(url).replace(/\.html$/, ""), "html", exists);
}

/**
 * `webpageOutputPath`, with the name taken on disk at once — an empty file that
 * monolith then writes over — so two saves of the same page started together
 * (the Download form and Fast Download) can't pick the same name.
 */
export function reserveWebpagePath(folder: string, url: string): string {
  for (;;) {
    const candidate = webpageOutputPath(folder, url);
    try {
      fs.writeFileSync(candidate, "", { flag: "wx" });
      return candidate;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error;
    }
  }
}

/** Remove the file `reserveWebpagePath` made when nothing was saved into it. */
function releaseEmpty(filePath: string) {
  try {
    if (fs.statSync(filePath).size === 0) fs.unlinkSync(filePath);
  } catch {
    // already gone
  }
}

export type MonolithResult = { filePath: string };

/**
 * Run monolith. Resolves with the saved file path on a zero exit; rejects with
 * the stderr text on a non-zero exit or with a watchdog kill if monolith stalls.
 * monolith writes the file itself via `--output`; when the save fails, an
 * empty file left at that path (the name reserved by `reserveWebpagePath`) is
 * removed. There is no progress callback — monolith emits no parseable
 * progress stream.
 */
export async function runMonolithSave(binaryPath: string, options: MonolithSaveOptions): Promise<MonolithResult> {
  let result: { code: number | null; stderr: string };
  try {
    result = await runWithWatchdog(binaryPath, buildMonolithArgs(options), {
      idleMs: options.idleMs ?? DEFAULT_IDLE_MS,
      abortSignal: options.abortSignal,
    });
  } catch (error) {
    releaseEmpty(options.outputPath);
    throw error;
  }
  if (result.code === 0) return { filePath: options.outputPath };
  releaseEmpty(options.outputPath);
  throw new Error(result.stderr.trim() || `monolith exited with code ${result.code}`);
}
