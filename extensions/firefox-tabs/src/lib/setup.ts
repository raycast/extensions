import { spawnSync } from "child_process";
import { accessSync, constants, existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { homedir } from "os";
import { dirname, join, resolve } from "path";
import { environment } from "@raycast/api";
import { MANIFEST_PATH } from "./manifest";

// -- Firefox detection --

/**
 * Check if Firefox.app is installed on macOS.
 * Simple path check — macOS only (Raycast is macOS-only).
 */
export function isFirefoxInstalled(): boolean {
  if (existsSync("/Applications/Firefox.app")) return true;
  // A running Firefox of any edition, wherever it is installed.
  if (spawnSync("pgrep", ["-x", "firefox"], { stdio: "ignore" }).status === 0) return true;
  // Otherwise ask Launch Services, which finds apps outside /Applications.
  return FIREFOX_APP_NAMES.some((name) => spawnSync("/usr/bin/open", ["-Ra", name], { stdio: "ignore" }).status === 0);
}

const FIREFOX_APP_NAMES = ["Firefox", "Firefox Developer Edition", "Firefox Nightly"];

// -- Path resolution --

/**
 * Production path: installed bundle location.
 * Phase 11 (installer) will place files here.
 */
const PRODUCTION_RUN_SH = join(homedir(), ".raycast-firefox", "bin", "run.sh");

/**
 * Resolve the absolute path to native-host/run.sh.
 *
 * Dual-mode resolution:
 * 1. Dev path: if assets/project-root.txt exists (written by prebuild script),
 *    resolve native-host/run.sh from the project root. This preserves the
 *    development workflow exactly.
 * 2. Production path: if ~/.raycast-firefox/bin/run.sh exists (installed bundle),
 *    use it. This enables the extension to work when installed from the Store
 *    without a git checkout.
 * 3. Neither found: throw an error guiding the user to run setup.
 */
export function resolveNativeHostPath(): string {
  // Dev path: project-root.txt exists -> use repo checkout
  const rootFile = join(environment.assetsPath, "project-root.txt");
  if (existsSync(rootFile)) {
    const projectRoot = readFileSync(rootFile, "utf-8").trim();
    const devPath = join(projectRoot, "native-host", "run.sh");
    if (existsSync(devPath)) {
      return resolve(devPath);
    }
  }

  // Production path: installed bundle
  if (existsSync(PRODUCTION_RUN_SH)) {
    return resolve(PRODUCTION_RUN_SH);
  }

  // Neither found
  throw new Error("Native host not found. Run the Set Up Firefox Bridge command to install it.");
}

// -- Manifest generation --

/**
 * Generate the native messaging host manifest JSON string.
 */
export function generateManifest(runShPath: string): string {
  return JSON.stringify(
    {
      name: "raycast_firefox",
      description: "Raycast Firefox tab management bridge",
      path: runShPath,
      type: "stdio",
      allowed_extensions: ["raycast-firefox@lau.engineering"],
    },
    null,
    2
  );
}

// -- Manifest location --

export { MANIFEST_PATH, isNativeHostRegistered } from "./manifest";

/** Version of the installed native host bundle, or null if it isn't installed. */
export function installedHostVersion(): string | null {
  try {
    return readFileSync(join(homedir(), ".raycast-firefox", "bin", "version.txt"), "utf-8").trim() || null;
  } catch {
    return null;
  }
}

// -- Manifest writing --

/**
 * Write the native messaging host manifest to the Firefox NativeMessagingHosts
 * directory.
 *
 * Creates the directory if it doesn't exist. Returns the absolute path where
 * the manifest was written.
 */
export function writeManifest(manifestJson: string): string {
  mkdirSync(dirname(MANIFEST_PATH), { recursive: true });
  writeFileSync(MANIFEST_PATH, manifestJson, "utf-8");
  return MANIFEST_PATH;
}

// -- Manifest validation --

/**
 * Validate that the written manifest file is correct:
 * - Exists and parses as valid JSON
 * - Has the correct name ("raycast_firefox")
 * - Has the expected path to run.sh
 * - The path points to an existing, executable file
 */
export function validateManifest(manifestPath: string, expectedRunShPath: string): { valid: boolean; error?: string } {
  try {
    const content = readFileSync(manifestPath, "utf-8");
    const manifest = JSON.parse(content) as { name?: string; path?: string };

    if (manifest.name !== "raycast_firefox") {
      return {
        valid: false,
        error: `Manifest name is "${manifest.name}", expected "raycast_firefox"`,
      };
    }

    if (manifest.path !== expectedRunShPath) {
      return {
        valid: false,
        error: `Manifest path is "${manifest.path}", expected "${expectedRunShPath}"`,
      };
    }

    try {
      accessSync(manifest.path, constants.X_OK);
    } catch {
      return {
        valid: false,
        error: `run.sh at "${manifest.path}" is not executable`,
      };
    }

    return { valid: true };
  } catch (err) {
    return {
      valid: false,
      error: `Failed to read/parse manifest: ${err instanceof Error ? err.message : String(err)}`,
    };
  }
}
