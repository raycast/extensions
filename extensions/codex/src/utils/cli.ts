import { execFile } from "node:child_process";
import { constants, existsSync } from "node:fs";
import { access, stat } from "node:fs/promises";
import nodePath from "node:path";
import { promisify } from "node:util";
import { getPreferenceValues } from "@raycast/api";
import { getErrorMessage } from "./format";
import { expandTildePath } from "./shell";

const execFileAsync = promisify(execFile);

const bundledCodexCliPath =
  "/Applications/ChatGPT.app/Contents/Resources/codex";

const userInstalledCodexCliPaths = [
  "/opt/homebrew/bin/codex",
  "/usr/local/bin/codex",
];

const commonCodexCliPaths = [
  bundledCodexCliPath,
  ...userInstalledCodexCliPaths,
];
let cachedCodexCliPath: string | undefined;
let codexCliResolution: Promise<string> | undefined;

class CodexCliResolutionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CodexCliResolutionError";
  }
}

function getPreferredCodexCliPath(): string {
  const preferences = getPreferenceValues<Preferences>();
  const configuredPath = preferences.codexCliPath?.trim();
  return configuredPath ? expandTildePath(configuredPath) : bundledCodexCliPath;
}

// Command for the user's own shell, which has a full PATH: prefer plain
// `codex` when a user install exists, and the bundled binary only as fallback.
export function shellCliCommand(): string {
  const preferences = getPreferenceValues<Preferences>();
  const configuredPath = preferences.codexCliPath?.trim();
  if (configuredPath) {
    return expandTildePath(configuredPath);
  }

  if (userInstalledCodexCliPaths.some((path) => existsSync(path))) {
    return "codex";
  }

  if (existsSync(bundledCodexCliPath)) {
    return bundledCodexCliPath;
  }

  return "codex";
}

export async function resolveCodexCliPath(): Promise<string> {
  if (cachedCodexCliPath) {
    return cachedCodexCliPath;
  }
  if (!codexCliResolution) {
    codexCliResolution = resolveCodexCliPathUncached().then(
      (resolvedPath) => {
        cachedCodexCliPath = resolvedPath;
        return resolvedPath;
      },
      (error) => {
        codexCliResolution = undefined;
        throw error;
      },
    );
  }
  return codexCliResolution;
}

async function resolveCodexCliPathUncached(): Promise<string> {
  const searchedPaths: string[] = [];
  const rejectedPaths: string[] = [];
  const preferredPath = getPreferredCodexCliPath();
  const candidatePaths = Array.from(
    new Set([preferredPath, ...commonCodexCliPaths]),
  );

  for (const candidatePath of candidatePaths) {
    searchedPaths.push(candidatePath);
    if (!(await isExecutableFile(candidatePath))) {
      continue;
    }

    const probeResult = await probeCodexAppServerSupport(candidatePath);
    if (probeResult.supported) {
      return candidatePath;
    }

    rejectedPaths.push(`${candidatePath} (${probeResult.reason})`);
  }

  const shellResolvedPath = await resolveCodexFromLoginShell();
  if (shellResolvedPath && !searchedPaths.includes(shellResolvedPath)) {
    searchedPaths.push(shellResolvedPath);

    const probeResult = await probeCodexAppServerSupport(shellResolvedPath);
    if (probeResult.supported) {
      return shellResolvedPath;
    }

    rejectedPaths.push(`${shellResolvedPath} (${probeResult.reason})`);
  }

  throw new CodexCliResolutionError(
    [
      "Unable to find an executable Codex CLI with app-server support.",
      `Searched: ${searchedPaths.join(", ")}`,
      rejectedPaths.length
        ? `Rejected: ${rejectedPaths.join("; ")}`
        : undefined,
      'Raycast runs with a limited PATH, so install Codex in a common location or ensure `zsh -lc "command -v codex"` can find it.',
    ]
      .filter(Boolean)
      .join(" "),
  );
}

async function isExecutableFile(filePath: string): Promise<boolean> {
  if (!nodePath.isAbsolute(filePath)) {
    return false;
  }

  try {
    const stats = await stat(filePath);
    if (!stats.isFile()) {
      return false;
    }

    await access(filePath, constants.X_OK);
    return true;
  } catch {
    return false;
  }
}

async function probeCodexAppServerSupport(
  codexPath: string,
): Promise<{ supported: true } | { supported: false; reason: string }> {
  try {
    const { stdout, stderr } = await execFileAsync(
      codexPath,
      ["app-server", "--help"],
      {
        maxBuffer: 512 * 1024,
        timeout: 5000,
      },
    );
    const helpText = `${stdout}\n${stderr}`;
    if (!helpText.includes("codex app-server")) {
      return {
        supported: false,
        reason: "app-server help output was not recognized",
      };
    }

    return { supported: true };
  } catch (error) {
    return {
      supported: false,
      reason: getErrorMessage(error),
    };
  }
}

async function resolveCodexFromLoginShell(): Promise<string | null> {
  try {
    const { stdout } = await execFileAsync(
      "/bin/zsh",
      ["-lc", "command -v codex"],
      {
        maxBuffer: 64 * 1024,
        timeout: 3000,
      },
    );
    const resolvedPath = stdout.trim().split(/\r?\n/)[0];
    return resolvedPath || null;
  } catch {
    return null;
  }
}
