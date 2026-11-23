import { getPreferenceValues } from "@raycast/api";
import { execFile, execFileSync, spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

export const MACWHISPER_BUNDLE_ID = "com.goodsnooze.MacWhisper";

const CLI_SYMLINK = "/usr/local/bin/mw";
const APP_CLI_RELATIVE_PATH = "Contents/MacOS/mw";
const COMMON_APP_PATHS = [
  "/Applications/MacWhisper.app",
  join(homedir(), "Applications/MacWhisper.app"),
  "/Applications/Setapp/MacWhisper.app",
];

const MAX_BUFFER = 100 * 1024 * 1024;

export const OUTPUT_FORMATS = ["txt", "srt", "vtt", "json", "csv", "md", "html", "avid"] as const;
export type OutputFormat = (typeof OUTPUT_FORMATS)[number];

export const EXPORT_STYLES = ["transcript", "subtitles", "segments"] as const;
export type ExportStyle = (typeof EXPORT_STYLES)[number];

export const GROUPINGS = ["none", "words", "sentences", "people"] as const;
export type Grouping = (typeof GROUPINGS)[number];

export type TranscribeOptions = {
  /** Model in `engine:model-id` form. Empty means the app's current model. */
  model?: string;
  /** ISO 639-1 code or `auto`. Empty falls back to the Default Language preference. */
  language?: string;
  format?: OutputFormat;
  style?: ExportStyle;
  /** Only valid with the `transcript` style. */
  group?: Grouping;
  /** Undefined keeps the app's setting. */
  speakers?: boolean;
  /** Undefined keeps the default (on when the transcript is diarized). */
  speakerNames?: boolean;
  /** Undefined keeps the style's setting. */
  timestamps?: boolean;
  endTimestamps?: boolean;
  milliseconds?: boolean;
  maxCharsPerLine?: number;
  /** Only affects the `avid` format. */
  fps?: number;
  persist?: boolean;
};

export type BatchOptions = TranscribeOptions & {
  outputDir: string;
  recursive?: boolean;
  overwrite?: boolean;
};

export type Model = {
  id: string;
  name: string;
  size: string;
  active: boolean;
};

export class MacWhisperError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MacWhisperError";
  }
}

export function expandHome(path: string): string {
  if (path === "~") return homedir();
  if (path.startsWith("~/")) return `${homedir()}${path.slice(1)}`;
  return path;
}

/** MacWhisper.app bundles: the usual locations first, then Spotlight by bundle id. */
function findAppBundles(): string[] {
  const found = COMMON_APP_PATHS.filter((path) => existsSync(path));
  if (found.length > 0) return found;
  try {
    const output = execFileSync("mdfind", [`kMDItemCFBundleIdentifier == '${MACWHISPER_BUNDLE_ID}'`], {
      encoding: "utf8",
      timeout: 3000,
    });
    return output
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.endsWith(".app"));
  } catch {
    return [];
  }
}

let cachedBinary: string | undefined;

/**
 * Locates the `mw` CLI: the preference override, the `/usr/local/bin/mw` symlink, then the copy inside MacWhisper.app
 * wherever the app is installed. Distinguishes "MacWhisper missing" from "MacWhisper too old to ship the CLI".
 */
export function resolveBinary(): string {
  const { mwPath } = getPreferenceValues<Preferences>();
  const custom = mwPath?.trim();
  if (custom) {
    const expanded = expandHome(custom);
    if (existsSync(expanded)) return expanded;
    throw new MacWhisperError(`The mw CLI was not found at "${custom}". Check the extension preferences.`);
  }
  if (cachedBinary && existsSync(cachedBinary)) return cachedBinary;
  if (existsSync(CLI_SYMLINK)) return (cachedBinary = CLI_SYMLINK);

  const apps = findAppBundles();
  const bundled = apps.map((app) => join(app, APP_CLI_RELATIVE_PATH)).find((path) => existsSync(path));
  if (bundled) return (cachedBinary = bundled);
  if (apps.length > 0) {
    throw new MacWhisperError(
      "This version of MacWhisper has no command-line tool. Update MacWhisper to 15.11 or later.",
    );
  }
  throw new MacWhisperError("MacWhisper is not installed. Install MacWhisper 15.11 or later.");
}

function errorFromStderr(stderr: string, fallback: string): string {
  const lines = stderr
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  const errorLine = lines.find((line) => line.startsWith("Error:"));
  if (errorLine) return errorLine.replace(/^Error:\s*/, "");
  if (lines.length > 0) return lines[lines.length - 1];
  return fallback;
}

function extractErrorMessage(error: unknown): string {
  const stderr = (error as { stderr?: string }).stderr ?? "";
  return errorFromStderr(stderr, error instanceof Error ? error.message : String(error));
}

async function runMw(args: string[]): Promise<{ stdout: string; stderr: string }> {
  const binary = resolveBinary();
  try {
    return await execFileAsync(binary, args, { maxBuffer: MAX_BUFFER });
  } catch (error) {
    throw new MacWhisperError(extractErrorMessage(error));
  }
}

function transcribeArgs(options: TranscribeOptions): string[] {
  const { defaultLanguage, saveToHistory } = getPreferenceValues<Preferences>();
  const args: string[] = [];
  const model = options.model?.trim();
  const language = options.language?.trim() || defaultLanguage?.trim();
  if (model) args.push("--model", model);
  if (language) args.push("--language", language);
  if (options.format) args.push("--format", options.format);
  if (options.style) args.push("--style", options.style);
  if (options.group && options.style === "transcript") args.push("--group", options.group);
  if (options.speakers !== undefined) args.push(options.speakers ? "--speakers" : "--no-speakers");
  if (options.speakerNames !== undefined) args.push(options.speakerNames ? "--speaker-names" : "--no-speaker-names");
  if (options.timestamps !== undefined) args.push(options.timestamps ? "--timestamps" : "--no-timestamps");
  if (options.endTimestamps) args.push("--end-timestamps");
  if (options.milliseconds) args.push("--milliseconds");
  if (options.maxCharsPerLine && options.maxCharsPerLine > 0) {
    args.push("--max-chars-per-line", String(Math.round(options.maxCharsPerLine)));
  }
  if (options.fps && options.fps > 0) args.push("--fps", String(options.fps));
  if (options.persist ?? saveToHistory) args.push("--persist");
  return args;
}

/** Transcribes a single file and returns the transcript in the requested format. */
export async function transcribeFile(path: string, options: TranscribeOptions = {}): Promise<string> {
  const { stdout } = await runMw(["transcribe", ...transcribeArgs(options), "--", expandHome(path)]);
  return stdout.trimEnd();
}

/** Transcribes a single file straight to `outputPath`. */
export async function transcribeFileTo(
  path: string,
  outputPath: string,
  options: TranscribeOptions & { overwrite?: boolean } = {},
): Promise<void> {
  const args = ["transcribe", ...transcribeArgs(options), "--output", expandHome(outputPath)];
  if (options.overwrite) args.push("--overwrite");
  await runMw([...args, "--", expandHome(path)]);
}

/** Transcribes every media file in a directory into `outputDir`. Returns the written file paths. */
export async function transcribeDirectory(directory: string, options: BatchOptions): Promise<string[]> {
  const args = ["transcribe", ...transcribeArgs(options), "--output-dir", expandHome(options.outputDir)];
  if (options.recursive) args.push("--recursive");
  if (options.overwrite) args.push("--overwrite");
  const { stdout, stderr } = await runMw([...args, "--", expandHome(directory)]);
  return `${stdout}\n${stderr}`
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.startsWith("Wrote "))
    .map((line) => line.slice("Wrote ".length));
}

/** `--stream` refuses export options (format, style, timestamps, speakers); only these are allowed. */
export type StreamOptions = Pick<TranscribeOptions, "model" | "language" | "persist">;

export type StreamHandle = {
  /** Resolves with the full transcript once MacWhisper is done. */
  done: Promise<string>;
  cancel: () => void;
};

/** Streams plain-text transcript segments as MacWhisper finalizes them (`mw transcribe --stream`). */
export function streamTranscription(
  path: string,
  options: StreamOptions,
  onText: (text: string) => void,
): StreamHandle {
  const binary = resolveBinary();
  const { model, language, persist } = options;
  const args = transcribeArgs({ model, language, persist });
  const child = spawn(binary, ["transcribe", "--stream", ...args, "--", expandHome(path)]);
  let stdout = "";
  let stderr = "";
  let cancelled = false;

  child.stdout.setEncoding("utf8");
  child.stderr.setEncoding("utf8");
  child.stdout.on("data", (chunk: string) => {
    stdout += chunk;
    onText(stdout);
  });
  child.stderr.on("data", (chunk: string) => {
    stderr += chunk;
  });

  const done = new Promise<string>((resolve, reject) => {
    child.on("error", (error) => reject(new MacWhisperError(error.message)));
    child.on("close", (code) => {
      if (cancelled) reject(new MacWhisperError("Transcription cancelled"));
      else if (code === 0) resolve(stdout.trimEnd());
      else reject(new MacWhisperError(errorFromStderr(stderr, `mw exited with code ${code}`)));
    });
  });

  return {
    done,
    cancel: () => {
      if (child.exitCode === null) {
        cancelled = true;
        child.kill("SIGTERM");
      }
    },
  };
}

/**
 * Parses the table printed by `mw models list`, e.g.
 * `▸ parakeet-pro:nvidia_parakeet-v3  Parakeet v3  1,24 GB`.
 */
export function parseModels(output: string): Model[] {
  const models: Model[] = [];
  for (const rawLine of output.split("\n")) {
    const active = rawLine.trimStart().startsWith("▸");
    const tokens = rawLine.replace("▸", " ").trim().split(/\s+/).filter(Boolean);
    const idIndex = tokens.findIndex((token) => token.includes(":"));
    if (idIndex !== 0 || tokens.length < 4) continue;
    const id = tokens[0];
    const size = tokens.slice(-2).join(" ");
    const name = tokens.slice(1, -2).join(" ");
    models.push({ id, name, size, active });
  }
  return models;
}

export async function listModels(): Promise<Model[]> {
  const { stdout } = await runMw(["models", "list"]);
  return parseModels(stdout);
}

export async function selectModel(modelId: string): Promise<void> {
  await runMw(["models", "select", modelId]);
}

export async function getVersion(): Promise<string> {
  const { stdout } = await runMw(["version"]);
  return stdout.trim();
}

export function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
