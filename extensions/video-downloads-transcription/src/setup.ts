import { existsSync, realpathSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { Settings, executable, run } from "./core";

export type Tool = {
  name: string;
  /** The program the extension runs. */
  binary: string;
  /** The Homebrew formula that installs it. */
  formula: string;
  purpose: string;
  /** The preference with the tool's path. */
  preference: keyof Settings;
};

export const tools: Tool[] = [
  {
    name: "yt-dlp",
    binary: "yt-dlp",
    formula: "yt-dlp",
    purpose: "Downloads subtitles, audio, video and photos",
    preference: "ytDlpPath",
  },
  {
    name: "ffmpeg",
    binary: "ffmpeg",
    formula: "ffmpeg",
    purpose: "Converts audio and video for MP3, M4A, MP4 and transcription",
    preference: "ffmpegPath",
  },
  {
    name: "whisper.cpp",
    binary: "whisper-cli",
    formula: "whisper.cpp",
    purpose: "Transcribes and translates recordings on your Mac",
    preference: "whisperPath",
  },
];

export type ToolStatus = Tool & { path?: string; version?: string };

/** The `brew` program, if Homebrew is installed. */
export function homebrew(): string | undefined {
  return ["/opt/homebrew/bin/brew", "/usr/local/bin/brew"].find(existsSync);
}

/** The version in a Homebrew install path, such as `1.9.4` in `…/Cellar/whisper.cpp/1.9.4/bin`. */
export function cellarVersion(path: string): string | undefined {
  return /\/Cellar\/[^/]+\/([^/]+)\//.exec(path)?.[1]?.replace(/_\d+$/, "");
}

async function toolVersion(
  tool: Tool,
  path: string,
): Promise<string | undefined> {
  try {
    if (tool.binary === "yt-dlp")
      return (
        await run(
          path,
          ["--ignore-config", "--version"],
          undefined,
          AbortSignal.timeout(5000),
        )
      ).trim();
    if (tool.binary === "ffmpeg")
      return /ffmpeg version (\S+)/.exec(
        await run(path, ["-version"], undefined, AbortSignal.timeout(5000)),
      )?.[1];
  } catch {
    /* installed, but the version couldn't be read */
  }
  return cellarVersion(realpathSync(path));
}

/**
 * Where each tool is installed and, unless `versions` is false, its version.
 * Missing tools have no path.
 */
export async function toolStatus(
  settings: Settings,
  { versions = true }: { versions?: boolean } = {},
): Promise<ToolStatus[]> {
  return await Promise.all(
    tools.map(async (tool) => {
      try {
        const configured = settings[tool.preference];
        const path = await executable(
          typeof configured === "string" ? configured : undefined,
          tool.binary,
        );
        return {
          ...tool,
          path,
          version: versions ? await toolVersion(tool, path) : undefined,
        };
      } catch {
        return tool;
      }
    }),
  );
}

/** A progress message for a line Homebrew prints, such as `Pouring ffmpeg…`. */
export function brewProgress(line: string): string | undefined {
  const step = /^==> (.+)$/.exec(line.trim())?.[1];
  if (!step || /^(Caveats|Summary|Running `brew cleanup`)/.test(step))
    return undefined;
  return step
    .replace(/^Pouring (\S+?)--.*$/, "Installing $1…")
    .replace(/^Fetching downloads for: (.+)$/, "Downloading $1…")
    .replace(/^Fetching (\S+)$/, "Downloading $1…");
}

/** The `Error:` lines in Homebrew's output, without its other messages. */
export function brewError(output: string): string | undefined {
  const errors = output
    .split("\n")
    .map((line) => /^Error: (.+)$/.exec(line.trim())?.[1])
    .filter(Boolean);
  return errors.length ? errors.join(" ") : undefined;
}

/** Installs Homebrew formulas, reporting Homebrew's steps as progress. */
export async function installWithHomebrew(
  formulas: string[],
  onProgress?: (message: string) => void,
  signal?: AbortSignal,
) {
  const brew = homebrew();
  if (!brew)
    throw new Error(
      "Homebrew is not installed. Install it from brew.sh, then try again.",
    );
  const prefix = dirname(dirname(brew));
  onProgress?.(`Installing ${formulas.join(", ")} with Homebrew…`);
  try {
    await run(
      brew,
      ["install", ...formulas],
      (line) => {
        const message = brewProgress(line);
        if (message) onProgress?.(message);
      },
      signal,
      {
        PATH: `${join(prefix, "bin")}:${join(prefix, "sbin")}:/usr/bin:/bin:/usr/sbin:/sbin`,
        HOME: homedir(),
        HOMEBREW_NO_ENV_HINTS: "1",
      },
    );
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") throw error;
    const reason = brewError(
      error instanceof Error ? error.message : String(error),
    );
    throw new Error(
      `Homebrew couldn't install ${formulas.join(", ")}${reason ? `: ${reason}` : "."} Run “brew install ${formulas.join(" ")}” in Terminal for details.`,
    );
  }
}
