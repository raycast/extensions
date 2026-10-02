import * as fs from "node:fs";
import * as path from "node:path";
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

/**
 * Matches `https://open.spotify.com[/<locale>]/playlist/...` playlist URLs. (It
 * also matches `spotify:playlist:...` URIs, but those never reach production:
 * isValidUrl rejects the `spotify:` scheme and detectSource only routes the
 * open.spotify.com host here.)
 */
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
 *
 * With `privateHome` (see `usesPrivateHome`), the credentials are in the
 * config file `writeSpotdlConfig` wrote and `--config` loads it, so the secret
 * never appears in the process table.
 */
export function buildSpotdlArgs(o: SpotdlDownloadOptions, privateHome = false): string[] {
  const isPlaylist = PLAYLIST_URL.test(o.url);
  const template = isPlaylist ? "{list-name}/{artists} - {title}.{output-ext}" : "{artists} - {title}.{output-ext}";
  // Join with a forward slash, not path.join: on Windows path.join would
  // rewrite the `/` inside the template placeholders to `\`, mangling spotDL's
  // template syntax. Python on Windows accepts forward slashes in real paths,
  // so a destination like `C:\Users\me\Music` followed by `/{list-name}/...`
  // works on both platforms.
  const dest = o.destination.replace(/[/\\]+$/, "");
  const args = ["download", o.url, "--output", `${dest}/${template}`, "--format", o.format, "--ffmpeg", o.ffmpegPath];
  const id = o.clientId?.trim();
  const secret = o.clientSecret?.trim();
  if (id && secret) {
    // spotDL ignores the SPOTIPY_CLIENT_ID/SECRET env vars (it always hands its
    // own --client-id/--client-secret, defaulting to its bundled app, to
    // spotipy), so the credentials go in its config file or on argv. argv is
    // only the fallback for spotDL installs that can't get a private home; there
    // the secret is visible to same-user processes while spotDL runs.
    if (privateHome) args.push("--config");
    else args.push("--client-id", id, "--client-secret", secret);
    args.push("--use-official-api");
    if (o.userAuth) {
      args.push("--user-auth");
    }
  }
  return args;
}

/**
 * The home folder spotDL runs with when it has a private one: its config
 * (with the credentials) and token caches live here, apart from the user's own
 * ~/.spotdl — so the extension never reads or clears another spotDL setup's
 * files.
 */
export function spotdlHome(supportDir: string): string {
  return path.join(supportDir, "spotdl-home");
}

/**
 * True when spotDL can run with a private home (`spotdlHome`): the extension's
 * own download and Homebrew's formula. Other installs keep the real home — a
 * `pip install --user` spotDL finds its own packages through HOME.
 */
export function usesPrivateHome(realBinaryPath: string, supportDir: string, platform = process.platform): boolean {
  const managed = path.resolve(realBinaryPath).startsWith(path.resolve(supportDir) + path.sep);
  return managed || (platform === "darwin" && realBinaryPath.includes("/Cellar/"));
}

/**
 * Write spotDL's config with the Spotify credentials (readable only by the
 * user) into `home`, or remove it when there are none — spotDL would otherwise
 * keep using stale credentials from the last run.
 */
export function writeSpotdlConfig(home: string, clientId?: string, clientSecret?: string): void {
  const dir = path.join(home, ".spotdl");
  const file = path.join(dir, "config.json");
  const id = clientId?.trim();
  const secret = clientSecret?.trim();
  if (!id || !secret) {
    fs.rmSync(file, { force: true });
    return;
  }
  fs.mkdirSync(dir, { recursive: true, mode: 0o700 });
  fs.writeFileSync(file, JSON.stringify({ client_id: id, client_secret: secret }), { mode: 0o600 });
  fs.chmodSync(file, 0o600); // writeFileSync's mode only applies when it creates the file
}

function realPathOf(p: string): string {
  try {
    return fs.realpathSync(p);
  } catch {
    return p;
  }
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
  // Spotify API errors come from spotipy as "HTTP Error for GET … returned 403
  // due to …". A bare "Forbidden" or "not found" elsewhere (yt-dlp fetching the
  // audio from YouTube, a missing ffmpeg) is not about the playlist.
  if (/returned\s+403\b/i.test(rawOutput)) {
    return {
      title: "Spotify: 403 Forbidden",
      message:
        "This playlist is private and not owned by you (or it's a Spotify-curated mix). Ask the owner to make it public, or pick a different playlist.",
      action: "open-setup-guide",
    };
  }
  if (/returned\s+404\b/i.test(rawOutput)) {
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
  let privateHome =
    options.supportDir && usesPrivateHome(realPathOf(binaryPath), realPathOf(options.supportDir))
      ? spotdlHome(options.supportDir)
      : undefined;
  let fellBack = false;
  if (privateHome) {
    try {
      writeSpotdlConfig(privateHome, options.clientId, options.clientSecret);
    } catch {
      privateHome = undefined; // can't prepare it — run spotDL the old way rather than fail the download
      fellBack = true;
    }
  }
  // Clear a token cached for other credentials (spotDL #2606) — in the private
  // home when there is one, which also keeps its own fingerprint, so the user's
  // real ~/.spotdl is never touched. After a fallback the fingerprint is in the
  // private home, so a check against the real home would find none and delete
  // the user's own cache: skip it for that run.
  if (options.supportDir && !fellBack) {
    invalidateSpotipyCacheIfStale(
      privateHome ?? options.supportDir,
      options.clientId,
      options.clientSecret,
      Boolean(options.userAuth),
      privateHome,
    );
  }
  const idleMs = options.idleMs ?? DEFAULT_IDLE_MS;
  let tracks = 0;
  // spotDL prints one "Downloaded ..." line per completed track. Line-buffered
  // (onStdoutLine) so a line split across two stream chunks counts exactly once
  // — chunk-based matching missed a keyword straddling the chunk boundary.
  const handleStdoutLine = (line: string) => {
    if (line.includes("Downloaded")) {
      tracks += 1;
      onProgress({ tracks });
    }
  };
  const { code, stdout, stderr } = await runWithWatchdog(binaryPath, buildSpotdlArgs(options, !!privateHome), {
    idleMs,
    // spotDL finds its folder through the home directory (USERPROFILE on Windows).
    env: privateHome ? { ...process.env, HOME: privateHome, USERPROFILE: privateHome } : undefined,
    onStdoutLine: handleStdoutLine,
    abortSignal: options.abortSignal,
    idleKillMessage: `spotdl produced no output for ${Math.round(
      idleMs / 1000,
    )}s and was killed. This usually means it is stuck on an auth or network step; check SPOTIFY.md or retry.`,
  });
  if (code === 0) return { tracks };
  const rawOutput = stderr.trim() || stdout.trim() || `spotdl exited with code ${code}`;
  throw new SpotdlDownloadError(tracks, rawOutput);
}
