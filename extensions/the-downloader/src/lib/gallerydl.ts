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
  const handleStdout = (chunk: string) => {
    // gallery-dl prints one downloaded file path per line, so non-empty lines ≈ files downloaded (progress estimate).
    const lines = chunk.split("\n").filter((l) => l.trim().length > 0);
    if (lines.length > 0) {
      files += lines.length;
      onProgress({ files });
    }
  };
  const { code, stderr } = await runWithWatchdog(binaryPath, buildGalleryArgs(options), {
    idleMs: options.idleMs ?? DEFAULT_IDLE_MS,
    onStdoutChunk: handleStdout,
    abortSignal: options.abortSignal,
  });
  if (code === 0) return { files };
  throw new Error(stderr.trim() || `gallery-dl exited with code ${code}`);
}
