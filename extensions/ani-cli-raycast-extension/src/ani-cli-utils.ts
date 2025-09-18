import { exec, spawn } from "child_process";
import { promisify } from "util";
const execAsync = promisify(exec);

// === TYPES AND INTERFACES ===

export interface PlaybackOptions {
  quality: "360p" | "480p" | "720p" | "1080p" | "best";
  episode: number | string;
  dub: boolean;
  useDirectTitle?: boolean;
}

export interface DownloadOptions extends PlaybackOptions {
  downloadPath?: string;
}

export interface SeriesDownloadOptions extends DownloadOptions {
  episodeRange: string;
}

export interface AniCliResult {
  success: boolean;
  data?: {
    command: string;
    message: string;
    pid?: number;
    selectedIndex?: number;
    matchedTitle?: string;
    downloadPath?: string;
    episodeRange?: string;
  };
  error?: string;
}

export interface AnimeMatch {
  selectIndex: number;
  title: string;
}

export interface Preferences {
  defaultQuality: PlaybackOptions["quality"];
  defaultAudio: "sub" | "dub";
}

// === CONSTANTS ===

export const QUALITY_OPTIONS: PlaybackOptions["quality"][] = [
  "best",
  "1080p",
  "720p",
  "480p",
  "360p",
];

const COMMON_PATHS = [
  "/opt/homebrew/bin/ani-cli",
  "/usr/local/bin/ani-cli",
  "/usr/bin/ani-cli",
  "/bin/ani-cli",
];

const EXPANDED_PATH = [
  "/opt/homebrew/bin",
  "/usr/local/bin",
  "/usr/bin",
  "/bin",
  process.env.PATH || "",
].join(":");

const PATH_CACHE_DURATION = 60000;
const SEARCH_TIMEOUT = 10000;
const COMMAND_TIMEOUT = 3000;

// === PATH MANAGEMENT ===

let cachedAniCliPath: string | null = null;
let pathCacheTimestamp = 0;

async function getAniCliPath(): Promise<string | null> {
  const now = Date.now();

  if (cachedAniCliPath && now - pathCacheTimestamp < PATH_CACHE_DURATION) {
    return cachedAniCliPath;
  }

  // Try common paths first
  for (const path of COMMON_PATHS) {
    try {
      await execAsync(`test -f "${path}" && test -x "${path}"`, {
        timeout: 1000,
      });
      cachedAniCliPath = path;
      pathCacheTimestamp = now;
      return path;
    } catch {
      continue;
    }
  }

  // Fallback to PATH search
  try {
    const { stdout } = await execAsync("which ani-cli", {
      timeout: COMMAND_TIMEOUT,
      env: { ...process.env, PATH: EXPANDED_PATH },
    });

    const path = stdout.trim();
    if (path) {
      await execAsync(`test -x "${path}"`, { timeout: 1000 });
      cachedAniCliPath = path;
      pathCacheTimestamp = now;
      return path;
    }
  } catch (error) {
    console.warn("PATH search for ani-cli failed:", error);
  }

  cachedAniCliPath = null;
  pathCacheTimestamp = 0;
  return null;
}

// === INSTALLATION CHECK ===

export async function checkAniCliInstallation(): Promise<boolean> {
  try {
    const aniCliPath = await getAniCliPath();
    if (!aniCliPath) return false;

    await execAsync(
      `"${aniCliPath}" --help 2>/dev/null || echo "help failed"`,
      {
        timeout: COMMAND_TIMEOUT,
        env: { ...process.env, PATH: EXPANDED_PATH },
      },
    );
    return true;
  } catch (error) {
    console.error("Installation check failed:", error);
    return false;
  }
}

// === ANIME SEARCH AND MATCHING ===

export async function findBestAnimeMatch(
  animeTitle: string,
): Promise<AnimeMatch | null> {
  const aniCliPath = await getAniCliPath();
  if (!aniCliPath) return null;

  try {
    console.log(`Finding best match for: "${animeTitle}"`);

    const searchProcess = spawn(aniCliPath, [animeTitle], {
      stdio: ["pipe", "pipe", "pipe"],
      env: {
        ...process.env,
        PATH: EXPANDED_PATH,
        TERM: "dumb",
        NO_COLOR: "1",
        DISPLAY: "",
        WAYLAND_DISPLAY: "",
      },
    });

    let searchOutput = "";
    let searchCompleted = false;

    const searchTimeout = setTimeout(() => {
      if (!searchCompleted && !searchProcess.killed) {
        searchProcess.kill("SIGTERM");
      }
    }, SEARCH_TIMEOUT);

    return new Promise((resolve) => {
      searchProcess.stdout.on("data", (data) => {
        searchOutput += data.toString();
      });

      searchProcess.on("close", () => {
        clearTimeout(searchTimeout);
        searchCompleted = true;

        const bestMatch = parseAndSelectBest(searchOutput, animeTitle);
        console.log(`Best match found:`, bestMatch);
        resolve(bestMatch);
      });

      searchProcess.on("error", () => {
        clearTimeout(searchTimeout);
        resolve(null);
      });

      setTimeout(() => {
        if (!searchCompleted && !searchProcess.killed) {
          searchProcess.stdin.write("\u001b");
        }
      }, 2000);
    });
  } catch (error) {
    console.error("Search failed:", error);
    return null;
  }
}

function parseAndSelectBest(
  output: string,
  originalQuery: string,
): AnimeMatch | null {
  // Fixed: Use string fromCharCode to avoid no-control-regex lint error
  const escapeChar = String.fromCharCode(27); // ESC character
  const ansiRegex = new RegExp(escapeChar + "\\[[0-9;]*[mK]", "g");
  const cleanOutput = output
    .replace(ansiRegex, "")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n");

  const lines = cleanOutput.split("\n").map((line) => line.trim());
  const results: Array<{
    index: number;
    title: string;
    episodes: number;
    score: number;
  }> = [];

  for (const line of lines) {
    const patterns = [
      /^(\d+)\)\s*(.+?)(?:\s*\((\d+)\s*(?:episodes?|eps?)\))?$/i,
      /^(\d+)\.?\s*(.+?)(?:\s*\[(\d+)\s*(?:episodes?|eps?)\])?$/i,
      /^(\d+):\s*(.+?)(?:\s*-\s*(\d+)\s*(?:episodes?|eps?))?$/i,
    ];

    for (const pattern of patterns) {
      const match = line.match(pattern);
      if (match) {
        const [, indexStr, title, episodeStr] = match;
        const index = parseInt(indexStr, 10);
        const cleanTitle = title.trim();
        const episodes = episodeStr
          ? parseInt(episodeStr, 10)
          : estimateEpisodeCount(cleanTitle);

        if (cleanTitle.length > 2) {
          const score = calculateMatchScore(
            cleanTitle,
            originalQuery,
            episodes,
          );
          results.push({ index, title: cleanTitle, episodes, score });
        }
        break;
      }
    }
  }

  if (results.length === 0) return null;

  results.sort((a, b) => {
    if (Math.abs(a.score - b.score) < 0.1) {
      return b.episodes - a.episodes;
    }
    return b.score - a.score;
  });

  const bestMatch = results[0];
  console.log(
    `Selected: #${bestMatch.index} "${bestMatch.title}" (${bestMatch.episodes} eps, score: ${bestMatch.score.toFixed(2)})`,
  );

  return {
    selectIndex: bestMatch.index,
    title: bestMatch.title,
  };
}

function calculateMatchScore(
  title: string,
  query: string,
  episodes: number,
): number {
  const titleLower = title.toLowerCase();
  const queryLower = query.toLowerCase();
  let score = 0;

  // Exact match
  if (titleLower === queryLower) score += 100;

  // Contains match
  if (titleLower.includes(queryLower)) score += 50;

  // Word-by-word matching
  const queryWords = queryLower.split(/\s+/);
  const titleWords = titleLower.split(/\s+/);

  for (const queryWord of queryWords) {
    for (const titleWord of titleWords) {
      if (titleWord === queryWord) {
        score += 20;
      } else if (
        titleWord.includes(queryWord) ||
        queryWord.includes(titleWord)
      ) {
        score += 10;
      }
    }
  }

  // Episode count bonus
  score += Math.min(episodes / 10, 15);

  // Length penalty for overly long titles
  if (title.length > query.length * 3) score -= 10;

  // Preference for main series
  if (
    titleLower.includes("tv") ||
    titleLower.includes("season 1") ||
    titleLower.includes("(2023)") ||
    titleLower.includes("(2024)")
  ) {
    score += 15;
  }

  // Penalty for specials/movies
  if (
    titleLower.includes("ova") ||
    titleLower.includes("special") ||
    titleLower.includes("movie") ||
    titleLower.includes("film")
  ) {
    score -= 20;
  }

  return score;
}

// === COMMAND BUILDING ===

function buildBaseAniCliArgs(
  options: PlaybackOptions,
  selectIndex?: number,
): string[] {
  const args: string[] = [];

  // Quality
  if (options.quality && options.quality !== "best") {
    args.push("-q", options.quality);
  }

  // Episode(s)
  if (options.episode) {
    args.push("-e", options.episode.toString());
  }

  // Audio type
  if (options.dub) {
    args.push("--dub");
  }

  // Selection index
  args.push("-S", (selectIndex || 1).toString());

  return args;
}

function buildPlayCommand(
  aniCliPath: string,
  animeTitle: string,
  options: PlaybackOptions,
  selectIndex?: number,
): string[] {
  const args = buildBaseAniCliArgs(options, selectIndex);
  args.push(animeTitle);
  return args;
}

function buildDownloadCommand(
  aniCliPath: string,
  animeTitle: string,
  options: DownloadOptions,
  selectIndex?: number,
): string[] {
  const args = ["-d"]; // Download flag first

  // Download path
  if (options.downloadPath) {
    args.push("-D", options.downloadPath);
  }

  // Add base options
  args.push(...buildBaseAniCliArgs(options, selectIndex));
  args.push(animeTitle);
  return args;
}

function buildSeriesDownloadCommand(
  aniCliPath: string,
  animeTitle: string,
  options: SeriesDownloadOptions,
  selectIndex?: number,
): string[] {
  const args = ["-d"]; // Download flag first

  // Download path
  if (options.downloadPath) {
    args.push("-D", options.downloadPath);
  }

  // Use episode range instead of single episode
  const modifiedOptions = { ...options, episode: options.episodeRange };
  args.push(...buildBaseAniCliArgs(modifiedOptions, selectIndex));
  args.push(animeTitle);
  return args;
}

// === EXECUTION HELPERS ===

function createProcessEnv() {
  return {
    ...process.env,
    PATH: EXPANDED_PATH,
    DISPLAY: "",
    WAYLAND_DISPLAY: "",
    NO_COLOR: "1",
  };
}

async function executeAniCliCommand(
  aniCliPath: string,
  args: string[],
  animeTitle: string,
  isBackground = true,
): Promise<{ pid?: number; command: string }> {
  console.log(`Executing: ${aniCliPath} ${args.join(" ")}`);

  const childProcess = spawn(aniCliPath, args, {
    stdio: isBackground
      ? ["ignore", "ignore", "ignore"]
      : ["ignore", "pipe", "pipe"],
    detached: isBackground,
    env: createProcessEnv(),
  });

  if (isBackground) {
    childProcess.unref();
  }

  return {
    pid: childProcess.pid,
    command: `${aniCliPath} ${args.join(" ")}`,
  };
}

// === PUBLIC API FUNCTIONS ===

/**
 * Play anime seamlessly in the background
 */
export async function playAnimeSeamlessly(
  animeTitle: string,
  options: PlaybackOptions,
): Promise<AniCliResult> {
  try {
    const aniCliPath = await getAniCliPath();
    if (!aniCliPath) {
      return { success: false, error: "ani-cli not found in system PATH" };
    }

    console.log("Finding best match for anime...");
    const bestMatch = await findBestAnimeMatch(animeTitle);
    const selectIndex = bestMatch?.selectIndex || 1;
    const matchedTitle = bestMatch?.title || animeTitle;

    console.log(`Using selection index: ${selectIndex} for "${matchedTitle}"`);

    const args = buildPlayCommand(aniCliPath, animeTitle, options, selectIndex);
    const { pid, command } = await executeAniCliCommand(
      aniCliPath,
      args,
      animeTitle,
      true,
    );

    return {
      success: true,
      data: {
        command,
        message: `Started "${matchedTitle}" episode ${options.episode} seamlessly (selection #${selectIndex})`,
        pid,
        selectedIndex: selectIndex,
        matchedTitle: matchedTitle,
      },
    };
  } catch (error) {
    console.error("Seamless playback failed:", error);
    return {
      success: false,
      error: `Failed to start seamless playback: ${error}`,
    };
  }
}

/**
 * Download a single anime episode
 */
export async function downloadAnime(
  animeTitle: string,
  options: DownloadOptions,
): Promise<AniCliResult> {
  try {
    const aniCliPath = await getAniCliPath();
    if (!aniCliPath) {
      return { success: false, error: "ani-cli not found in system PATH" };
    }

    console.log("Finding best match for download...");
    const bestMatch = await findBestAnimeMatch(animeTitle);
    const selectIndex = bestMatch?.selectIndex || 1;
    const matchedTitle = bestMatch?.title || animeTitle;

    console.log(`Using selection index: ${selectIndex} for "${matchedTitle}"`);

    const args = buildDownloadCommand(
      aniCliPath,
      animeTitle,
      options,
      selectIndex,
    );
    const { pid, command } = await executeAniCliCommand(
      aniCliPath,
      args,
      animeTitle,
      true,
    );

    return {
      success: true,
      data: {
        command,
        message: `Started downloading "${matchedTitle}" episode ${options.episode} (selection #${selectIndex})`,
        pid,
        selectedIndex: selectIndex,
        matchedTitle: matchedTitle,
        downloadPath: options.downloadPath || "Default location",
      },
    };
  } catch (error) {
    console.error("Download failed:", error);
    return {
      success: false,
      error: `Failed to start download: ${error}`,
    };
  }
}

/**
 * Download multiple anime episodes (series download)
 */
export async function downloadAnimeSeries(
  animeTitle: string,
  options: SeriesDownloadOptions,
): Promise<AniCliResult> {
  try {
    const aniCliPath = await getAniCliPath();
    if (!aniCliPath) {
      return { success: false, error: "ani-cli not found in system PATH" };
    }

    console.log(
      `Finding best match for series download: ${options.episodeRange}`,
    );
    const bestMatch = await findBestAnimeMatch(animeTitle);
    const selectIndex = bestMatch?.selectIndex || 1;
    const matchedTitle = bestMatch?.title || animeTitle;

    console.log(`Using selection index: ${selectIndex} for "${matchedTitle}"`);

    const args = buildSeriesDownloadCommand(
      aniCliPath,
      animeTitle,
      options,
      selectIndex,
    );
    const { pid, command } = await executeAniCliCommand(
      aniCliPath,
      args,
      animeTitle,
      true,
    );

    return {
      success: true,
      data: {
        command,
        message: `Started downloading "${matchedTitle}" episodes ${options.episodeRange} (selection #${selectIndex})`,
        pid,
        selectedIndex: selectIndex,
        matchedTitle: matchedTitle,
        downloadPath: options.downloadPath || "Default location",
        episodeRange: options.episodeRange,
      },
    };
  } catch (error) {
    console.error("Series download failed:", error);
    return {
      success: false,
      error: `Failed to start series download: ${error}`,
    };
  }
}

/**
 * Generate and copy ani-cli command to clipboard
 */
export async function copyAniCliCommand(
  animeTitle: string,
  options: PlaybackOptions,
  isDownload: boolean = false,
  downloadPath?: string,
): Promise<AniCliResult> {
  try {
    const aniCliPath = await getAniCliPath();
    if (!aniCliPath) {
      return { success: false, error: "ani-cli not found in system PATH" };
    }

    const bestMatch = await findBestAnimeMatch(animeTitle);
    const selectIndex = bestMatch?.selectIndex || 1;

    let args: string[];
    if (isDownload) {
      const downloadOptions: DownloadOptions = { ...options, downloadPath };
      args = buildDownloadCommand(
        aniCliPath,
        animeTitle,
        downloadOptions,
        selectIndex,
      );
    } else {
      args = buildPlayCommand(aniCliPath, animeTitle, options, selectIndex);
    }

    const command = `${aniCliPath} ${args.join(" ")}`;
    const actionType = isDownload ? "download" : "play";

    return {
      success: true,
      data: {
        command,
        message: `${actionType.charAt(0).toUpperCase() + actionType.slice(1)} command for "${animeTitle}" episode ${options.episode} copied to clipboard (selection #${selectIndex})`,
        selectedIndex: selectIndex,
        matchedTitle: bestMatch?.title || animeTitle,
      },
    };
  } catch (error) {
    return { success: false, error: `Failed to generate command: ${error}` };
  }
}

/**
 * Estimate episode count from anime title
 */
export function estimateEpisodeCount(title: string): number {
  const lowerTitle = title.toLowerCase();

  if (lowerTitle.includes("movie") || lowerTitle.includes("film")) return 1;

  const episodeMatch = title.match(/(\d+)\s*(?:episodes?|eps?)/i);
  if (episodeMatch) return parseInt(episodeMatch[1], 10);

  if (lowerTitle.includes("season 1") || lowerTitle.includes("s1")) return 12;
  if (lowerTitle.match(/season\s*[2-5]|s[2-5]/)) return 12;

  return 24;
}

// === VALIDATION HELPERS ===

/**
 * Validate episode range format
 */
export function validateEpisodeRange(range: string): boolean {
  const trimmed = range.trim();
  if (!trimmed) return false;

  // Single episode: "5"
  if (/^\d+$/.test(trimmed)) return true;

  // Range: "1-12", "5-24"
  if (/^\d+-\d+$/.test(trimmed)) {
    const [start, end] = trimmed.split("-").map(Number);
    return start > 0 && end > start;
  }

  return false;
}

/**
 * Validate episode number
 */
export function validateEpisodeNumber(episode: string | number): boolean {
  const num = typeof episode === "string" ? parseInt(episode, 10) : episode;
  return !isNaN(num) && num > 0;
}
