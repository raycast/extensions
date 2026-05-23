import { DEFAULT_IDLE_MS, runWithWatchdog } from "./run.js";

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

export type MonolithResult = { filePath: string };

/**
 * Run monolith. Resolves with the saved file path on a zero exit; rejects with
 * the stderr text on a non-zero exit or with a watchdog kill if monolith stalls.
 * monolith writes the file itself via `--output`, so the runner does not touch
 * the filesystem. There is no progress callback — monolith emits no parseable
 * progress stream.
 */
export async function runMonolithSave(binaryPath: string, options: MonolithSaveOptions): Promise<MonolithResult> {
  const { code, stderr } = await runWithWatchdog(binaryPath, buildMonolithArgs(options), {
    idleMs: options.idleMs ?? DEFAULT_IDLE_MS,
    abortSignal: options.abortSignal,
  });
  if (code === 0) return { filePath: options.outputPath };
  throw new Error(stderr.trim() || `monolith exited with code ${code}`);
}
