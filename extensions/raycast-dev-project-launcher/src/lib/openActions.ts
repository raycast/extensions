import { execFile } from "child_process";
import fs from "fs";
import os from "os";
import path from "path";
import { promisify } from "util";
import type { EditorTarget } from "../types";

const execFileAsync = promisify(execFile);

/**
 * Raycast's extension host runs Node with a minimal PATH, so CLI launcher
 * shims installed by VS Code ("Shell Command: Install 'code' command"),
 * JetBrains Toolbox, etc. are frequently missing from `process.env.PATH`.
 * We extend it with the handful of locations those installers commonly use.
 */
function buildAugmentedEnv(): NodeJS.ProcessEnv {
  const home = os.homedir();
  const extraPaths = [
    "/usr/local/bin",
    "/opt/homebrew/bin",
    "/usr/bin",
    "/bin",
    "/usr/sbin",
    "/sbin",
    path.join(home, "Library/Application Support/JetBrains/Toolbox/scripts"),
    path.join(home, ".local/bin"),
  ];
  const currentPath = process.env.PATH ?? "";
  const merged = Array.from(
    new Set([...currentPath.split(":").filter(Boolean), ...extraPaths]),
  ).join(":");
  return { ...process.env, PATH: merged };
}

function looksLikeAppBundle(value: string): boolean {
  return value.trim().toLowerCase().endsWith(".app");
}

function looksLikeAbsoluteBinaryPath(value: string): boolean {
  return value.startsWith("/") && !looksLikeAppBundle(value);
}

/**
 * Reverse-DNS bundle identifier such as `com.apple.dt.Xcode`. Launch Services
 * resolves these wherever the app actually lives, which absolute paths can't do
 * for side-by-side installs like `/Applications/Xcode-26.6.0.app`.
 */
function looksLikeBundleIdentifier(value: string): boolean {
  return /^[A-Za-z0-9-]+(\.[A-Za-z0-9-]+){2,}$/.test(value.trim());
}

/** Opens `projectPath` with the app registered under `bundleId` via `open -b`. */
async function openWithBundleIdentifier(
  bundleId: string,
  projectPath: string,
  target: EditorTarget,
): Promise<void> {
  try {
    await execFileAsync("open", ["-b", bundleId, projectPath], { env: buildAugmentedEnv() });
  } catch {
    throw new OpenActionError(
      `No app registered for bundle identifier "${bundleId}". Set a different app in Manage App Paths.`,
      target,
      `open -b "${bundleId}" "${projectPath}"`,
    );
  }
}

export class OpenActionError extends Error {
  constructor(
    message: string,
    public readonly target: EditorTarget,
    public readonly attemptedCommand: string,
  ) {
    super(message);
    this.name = "OpenActionError";
  }
}

/** Opens `projectPath` using an app bundle path or a Spotlight-resolvable app display name via `open -a`. */
async function openWithAppBundle(
  appPathOrName: string,
  projectPath: string,
  target: EditorTarget,
): Promise<void> {
  try {
    await execFileAsync("open", ["-a", appPathOrName, projectPath], { env: buildAugmentedEnv() });
  } catch (error) {
    throw new OpenActionError(
      `Couldn't open with "${appPathOrName}". Make sure the app is installed and the path is correct in Manage App Paths.`,
      target,
      `open -a "${appPathOrName}" "${projectPath}"`,
    );
  }
}

/** Opens `projectPath` by invoking a CLI binary (absolute path or bare command resolved via PATH) directly. */
async function openWithCliBinary(
  binary: string,
  projectPath: string,
  target: EditorTarget,
): Promise<void> {
  try {
    await execFileAsync(binary, [projectPath], { env: buildAugmentedEnv() });
  } catch (error) {
    const err = error as NodeJS.ErrnoException;
    if (err.code === "ENOENT") {
      throw new OpenActionError(
        `Command "${binary}" was not found on PATH. Set an absolute binary or .app path for this project type in Manage App Paths.`,
        target,
        `${binary} "${projectPath}"`,
      );
    }
    throw new OpenActionError(
      `Failed to launch "${binary}": ${err.message}`,
      target,
      `${binary} "${projectPath}"`,
    );
  }
}

/**
 * Opens a project folder in VS Code using the resolved path/command, which may be:
 *  - an absolute path to a `.app` bundle (uses `open -a`)
 *  - an absolute path to the `code` CLI binary (invoked directly)
 *  - a bare command name such as "code" (resolved via an augmented PATH)
 */
export async function openInVSCode(projectPath: string, resolvedPath: string): Promise<void> {
  await openWithEditor(projectPath, resolvedPath, "vscode");
}

/**
 * Opens a project folder in whichever app is configured as `preferred` for its
 * project type — Xcode for an Xcode project, VS Code for a Node project, etc.
 */
export async function openInPreferredApp(projectPath: string, resolvedPath: string): Promise<void> {
  await openWithEditor(projectPath, resolvedPath, "preferred");
}

/** Opens a project folder in WebStorm (or any JetBrains IDE command configured for the type). */
export async function openInWebStorm(projectPath: string, resolvedPath: string): Promise<void> {
  await openWithEditor(projectPath, resolvedPath, "webstorm");
}

/**
 * Opens a new iTerm window/tab already `cd`'d into `projectPath`. iTerm
 * registers as a folder-open handler, so `open -a <iTerm path or name> <dir>`
 * opens a new session rooted at that directory without needing AppleScript.
 */
export async function openInITerm(projectPath: string, resolvedPath: string): Promise<void> {
  const target: EditorTarget = "iterm";
  if (
    looksLikeAbsoluteBinaryPath(resolvedPath) &&
    fs.existsSync(resolvedPath) &&
    fs.statSync(resolvedPath).isFile()
  ) {
    // Rare case: user pointed straight at an executable rather than the .app bundle or a name.
    await openWithCliBinary(resolvedPath, projectPath, target);
    return;
  }
  await openWithAppBundle(resolvedPath, projectPath, target);
}

async function openWithEditor(
  projectPath: string,
  resolvedPath: string,
  target: EditorTarget,
): Promise<void> {
  if (looksLikeAppBundle(resolvedPath)) {
    await openWithAppBundle(resolvedPath, projectPath, target);
    return;
  }
  if (looksLikeBundleIdentifier(resolvedPath)) {
    await openWithBundleIdentifier(resolvedPath, projectPath, target);
    return;
  }
  // Absolute binary path or bare command name — both are handled the same way,
  // since execFile resolves bare names via the (augmented) PATH.
  await openWithCliBinary(resolvedPath, projectPath, target);
}

/** Reveals the project folder in Finder. */
export async function revealInFinder(projectPath: string): Promise<void> {
  await execFileAsync("open", ["-R", projectPath], { env: buildAugmentedEnv() });
}
