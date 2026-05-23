import path from "node:path";
import { DEFAULT_IDLE_MS, runWithWatchdog } from "./run.js";
import { invalidateSpotipyCacheIfStale } from "./spotdl-cache.js";

export type SpotdlDownloadOptions = {
  url: string;
  destination: string;
  format: string;
  ffmpegPath: string;
  /** Spotify API credentials. Both must be present and non-empty for either to be passed. */
  clientId?: string;
  clientSecret?: string;
  /**
   * When true (and credentials are present), append `--user-auth` so spotDL runs
   * the OAuth Authorization Code flow on first use — required to read private
   * playlists or library content. The Dev app must have `http://127.0.0.1:9900/`
   * registered as a Redirect URI; the watchdog in `runSpotdlDownload` kills the
   * child if the callback never arrives.
   */
  userAuth?: boolean;
  /**
   * Raycast support directory. Used to persist the credentials fingerprint so
   * spotDL's cached OAuth token can be invalidated when credentials change
   * (upstream #2606). When omitted, the cache is left alone — callers that
   * never change credentials between runs don't need this.
   */
  supportDir?: string;
  /** Idle-watchdog window in ms. Defaults to DEFAULT_IDLE_MS if omitted. */
  idleMs?: number;
  /** Aborting cancels the download mid-flight. */
  abortSignal?: AbortSignal;
};

/** Matches both `https://open.spotify.com[/<locale>]/playlist/...` URLs and `spotify:playlist:...` URIs. */
const PLAYLIST_URL = /(?:\/|:)playlist(?:\/|:)/i;

/**
 * Build spotDL CLI args. Files are written as `<artists> - <title>.<ext>` in
 * the destination. For playlist URLs the template is wrapped in a `{list-name}/`
 * subfolder so a multi-track download lands in its own directory instead of
 * scattering across the download root. When both Spotify API credentials are
 * provided, they are appended together with `--use-official-api` so spotDL talks
 * only to the Spotify Web API. Without that flag spotDL still falls into
 * librespot for track-hash checks (`_get_auth_vars` → "Could not get session
 * auth tokens"), which depends on a third-party host (`code.thetadev.de`) for
 * current secrets and outdated bundled fallbacks — both broken in practice.
 */
export function buildSpotdlArgs(o: SpotdlDownloadOptions): string[] {
  const isPlaylist = PLAYLIST_URL.test(o.url);
  const template = isPlaylist ? "{list-name}/{artists} - {title}.{output-ext}" : "{artists} - {title}.{output-ext}";
  const args = [
    "download",
    o.url,
    "--output",
    path.join(o.destination, template),
    "--format",
    o.format,
    "--ffmpeg",
    o.ffmpegPath,
  ];
  const id = o.clientId?.trim();
  const secret = o.clientSecret?.trim();
  if (id && secret) {
    args.push("--client-id", id, "--client-secret", secret, "--use-official-api");
    if (o.userAuth) {
      args.push("--user-auth");
    }
  }
  return args;
}

export type SpotdlProgress = { tracks: number };

/**
 * Structured summary of a spotDL failure — what to show in the toast and which
 * follow-up action best helps the user resolve it. Built from the raw stdout/
 * stderr by pattern-matching common spotDL/Spotify error signatures.
 */
export type SpotdlErrorSummary = {
  title: string;
  message: string;
  /** Follow-up to surface as the toast's secondary action. */
  action?: "open-preferences" | "open-setup-guide";
};

/**
 * Parse a chunk of spotDL output and produce a human-readable summary. The toast
 * shows this instead of dumping the Python traceback. The raw output stays
 * accessible via `SpotdlDownloadError.rawOutput` so the user can still copy the
 * full text via the Copy action.
 */
export function summarizeSpotdlError(rawOutput: string): SpotdlErrorSummary {
  if (/returned\s+403|\bForbidden\b/i.test(rawOutput)) {
    return {
      title: "Spotify: 403 Forbidden",
      message:
        "This playlist is private and not owned by you (or it's a Spotify-curated mix). Ask the owner to make it public, or pick a different playlist.",
      action: "open-setup-guide",
    };
  }
  if (/returned\s+404|\bNot Found\b/i.test(rawOutput)) {
    return {
      title: "Spotify: 404 Not Found",
      message:
        "The playlist isn't reachable with the current auth. If it's yours, enable 'Spotify: User Authentication' in preferences; otherwise it may be private to someone else.",
      action: "open-setup-guide",
    };
  }
  if (/Could not get session auth tokens/i.test(rawOutput)) {
    return {
      title: "Spotify credentials missing or rejected",
      message:
        "Set 'Spotify: Client ID' and 'Spotify: Client Secret' in extension preferences. See SPOTIFY.md for the one-minute setup.",
      action: "open-preferences",
    };
  }
  if (/Bad CPU type in executable|ENOEXEC|cannot execute binary file/i.test(rawOutput)) {
    return {
      title: "spotDL needs Rosetta 2",
      message:
        "The spotDL prebuilt binary is x86_64-only. Open Terminal and run: softwareupdate --install-rosetta --agree-to-license — then retry the download.",
    };
  }
  if (/redirect_uri.*Not\s*matching/i.test(rawOutput)) {
    return {
      title: "Spotify redirect URI mismatch",
      message:
        "Add http://127.0.0.1:9900/ to your Spotify Dev app's Redirect URIs (developer.spotify.com → your app → Settings).",
      action: "open-setup-guide",
    };
  }
  const pythonException = rawOutput.match(/(KeyError|AttributeError|TypeError|IndexError|ValueError):\s*([^\n]+)/);
  if (pythonException) {
    return {
      title: "spotDL upstream bug",
      message: `spotDL crashed parsing the Spotify response (\`${pythonException[1]}: ${pythonException[2].trim().slice(0, 80)}\`). Try a different track/album/playlist, or check https://github.com/spotDL/spotify-downloader/issues for a known fix.`,
    };
  }
  const lastLine = rawOutput
    .split("\n")
    .map((l) => l.replace(/[|+\-\s]+$/g, "").trim())
    .filter((l) => l.length > 0 && !/^[|+-]+$/.test(l))
    .pop();
  return {
    title: "Download Failed",
    message: lastLine?.slice(0, 300) || "spotdl exited without a recognizable error message.",
  };
}

/**
 * Error thrown when spotDL exits non-zero. Carries the raw output so the user
 * can copy the full traceback, the parsed summary so the toast can show a
 * useful message, and the count of tracks already downloaded before the
 * failure (partial-progress info that would otherwise be lost on reject).
 */
export class SpotdlDownloadError extends Error {
  readonly tracks: number;
  readonly rawOutput: string;
  readonly summary: SpotdlErrorSummary;

  constructor(tracks: number, rawOutput: string) {
    const summary = summarizeSpotdlError(rawOutput);
    super(summary.message);
    this.name = "SpotdlDownloadError";
    this.tracks = tracks;
    this.rawOutput = rawOutput;
    this.summary = summary;
  }
}

/**
 * Run spotDL; onProgress fires as tracks complete. Resolves with the track count
 * or rejects with the failure output. spotDL is Python+Rich-based and routinely
 * prints tracebacks/errors to stdout rather than stderr, so stdout is captured
 * and used as the error message when stderr is empty.
 *
 * Built on the shared `runWithWatchdog`, which closes stdin (so spotdl can never
 * fall back to an interactive prompt that would hang forever), runs the idle
 * watchdog, and — crucially — waits for the child's real `close` before settling
 * on abort/timeout. spotDL-specific concerns stay here: credential-cache
 * invalidation before launch, per-track progress, and the SpotdlDownloadError
 * shape on a non-zero exit.
 */
export async function runSpotdlDownload(
  binaryPath: string,
  options: SpotdlDownloadOptions,
  onProgress: (p: SpotdlProgress) => void,
): Promise<SpotdlProgress> {
  if (options.supportDir) {
    invalidateSpotipyCacheIfStale(
      options.supportDir,
      options.clientId,
      options.clientSecret,
      Boolean(options.userAuth),
    );
  }
  const idleMs = options.idleMs ?? DEFAULT_IDLE_MS;
  let tracks = 0;
  const handleStdout = (chunk: string) => {
    // spotDL prints one "Downloaded ..." line per completed track.
    const completed = chunk.split("\n").filter((line) => line.includes("Downloaded")).length;
    if (completed > 0) {
      tracks += completed;
      onProgress({ tracks });
    }
  };
  const { code, stdout, stderr } = await runWithWatchdog(binaryPath, buildSpotdlArgs(options), {
    idleMs,
    onStdoutChunk: handleStdout,
    abortSignal: options.abortSignal,
    idleKillMessage: `spotdl produced no output for ${Math.round(
      idleMs / 1000,
    )}s and was killed. This usually means it is stuck on an auth or network step; check SPOTIFY.md or retry.`,
  });
  if (code === 0) return { tracks };
  const rawOutput = stderr.trim() || stdout.trim() || `spotdl exited with code ${code}`;
  throw new SpotdlDownloadError(tracks, rawOutput);
}
