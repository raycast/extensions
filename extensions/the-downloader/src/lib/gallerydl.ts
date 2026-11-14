import { DEFAULT_IDLE_MS, runWithWatchdog } from "./run.js";

export type GalleryDownloadOptions = {
  url: string;
  destination: string;
  cookiesFromBrowser?: string;
  /** Idle-watchdog window in ms. Defaults to DEFAULT_IDLE_MS if omitted. */
  idleMs?: number;
  /** Aborting cancels the download mid-flight. */
  abortSignal?: AbortSignal;
};

/** Build gallery-dl CLI args. `-d` is the base dir; gallery-dl creates per-site subfolders. */
export function buildGalleryArgs(o: GalleryDownloadOptions): string[] {
  const args = ["-d", o.destination];
  if (o.cookiesFromBrowser) args.push("--cookies-from-browser", o.cookiesFromBrowser);
  args.push(o.url);
  return args;
}

/**
 * Detect a gallery-dl error caused by the site requiring a logged-in session
 * (Instagram redirects to its login page, Twitter prints "Login required" when
 * the resource is gated, etc.). The fix is to set the Cookies from Browser
 * preference so gallery-dl uses the user's existing browser session.
 */
export function isLoginRequiredError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  return /redirect to login|login required|authentication required/i.test(error.message);
}

export type GalleryProgress = { files: number };

/** Run gallery-dl; onProgress fires as files land. Resolves with the count or rejects with stderr or a watchdog kill. */
export async function runGalleryDownload(
  binaryPath: string,
  options: GalleryDownloadOptions,
  onProgress: (p: GalleryProgress) => void,
): Promise<GalleryProgress> {
  let files = 0;
  const handleLine = (line: string) => {
    const trimmed = line.trim();
    // gallery-dl prints one path per file. Lines beginning with "#" mark files
    // it SKIPPED because they already exist on disk — not new downloads — so a
    // re-run of an already-fetched gallery would otherwise report them as
    // downloaded. Count only real, non-skip output lines. Newline-buffered
    // (onStdoutLine) so a path split across two stream chunks counts once.
    if (trimmed.length > 0 && !trimmed.startsWith("#")) {
      files += 1;
      onProgress({ files });
    }
  };
  const { code, stderr } = await runWithWatchdog(binaryPath, buildGalleryArgs(options), {
    idleMs: options.idleMs ?? DEFAULT_IDLE_MS,
    onStdoutLine: handleLine,
    abortSignal: options.abortSignal,
  });
  if (code === 0) return { files };
  throw new Error(stderr.trim() || `gallery-dl exited with code ${code}`);
}
