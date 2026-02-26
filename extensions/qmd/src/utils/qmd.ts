import { exec, execSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { homedir, platform } from "node:os";
import { join, dirname as path_dirname } from "node:path";
import { promisify } from "node:util";
import { getPreferenceValues } from "@raycast/api";
import type { DependencyStatus, QmdCollection, QmdContext, QmdFileListItem, QmdResult, ScoreColor } from "../types";
import { collectionsLogger, qmdLogger } from "./logger";
import { parseCollectionList, parseContextList, parseFileList } from "./parsers";

const execAsync = promisify(exec);

// ============================================================================
// QMD Config
// ============================================================================

const YAML_COLLECTIONS_SECTION = /^collections:\s*$/;
const YAML_TOP_LEVEL_KEY = /^\S/;
const YAML_COLLECTION_NAME = /^ {2}(\S+):\s*$/;
const YAML_COLLECTION_PATH = /^ {4}path:\s*(.+)$/;
const PENDING_EMBEDDINGS_PATTERN = /\((\d+) unique hashes? need vectors?\)/;

/**
 * Get the qmd config file path
 */
function getQmdConfigPath(): string {
  return join(homedir(), ".config", "qmd", "index.yml");
}

/**
 * Read collection paths from qmd config file (~/.config/qmd/index.yml)
 * Returns a mapping of collection name to filesystem path
 */
export function getCollectionPaths(): Record<string, string> {
  const configPath = getQmdConfigPath();
  const paths: Record<string, string> = {};

  if (!existsSync(configPath)) {
    return paths;
  }

  try {
    const content = readFileSync(configPath, "utf-8");
    // Simple YAML parsing for the collections section
    // Format:
    // collections:
    //   obsidian:
    //     path: /path/to/folder
    const lines = content.split("\n");
    let currentCollection: string | null = null;
    let inCollections = false;

    for (const line of lines) {
      // Check if we're in the collections section
      if (YAML_COLLECTIONS_SECTION.test(line)) {
        inCollections = true;
        continue;
      }

      // Check if we've left the collections section (new top-level key)
      if (inCollections && YAML_TOP_LEVEL_KEY.test(line) && !line.startsWith(" ")) {
        break;
      }

      if (inCollections) {
        // Match collection name (2 spaces indent)
        const collectionMatch = line.match(YAML_COLLECTION_NAME);
        if (collectionMatch) {
          currentCollection = collectionMatch[1];
          continue;
        }

        // Match path line (4 spaces indent)
        if (currentCollection) {
          const pathMatch = line.match(YAML_COLLECTION_PATH);
          if (pathMatch) {
            paths[currentCollection] = pathMatch[1].trim();
            currentCollection = null;
          }
        }
      }
    }
  } catch (error) {
    collectionsLogger.error("Failed to read qmd config", { error });
  }

  return paths;
}

// ============================================================================
// Path & Environment Utilities
// ============================================================================

/**
 * Get environment with extended PATH for Raycast sandbox
 * Raycast doesn't inherit the user's shell PATH, so we need to add common paths
 */
function getEnvWithPath(): NodeJS.ProcessEnv {
  const home = homedir();
  const additionalPaths = [
    join(home, ".bun", "bin"), // Bun default install location
    join(home, ".local", "bin"), // Common user bin
    "/opt/homebrew/bin", // Homebrew on Apple Silicon
    "/usr/local/bin", // Homebrew on Intel Mac / common location
    "/usr/bin",
    "/bin",
  ];

  const currentPath = process.env.PATH || "";
  const newPath = [...additionalPaths, currentPath].join(":");

  return {
    ...process.env,
    PATH: newPath,
  };
}

function findInPath(executable: string): string | null {
  try {
    const result = execSync(`which ${executable}`, {
      encoding: "utf-8",
      env: getEnvWithPath(),
    }).trim();
    return result || null;
  } catch {
    return null;
  }
}

/**
 * Get the full path to the bun executable
 */
function getBunExecutable(): string {
  const preferences = getPreferenceValues<Preferences>();

  if (preferences.bunExecutablePath) {
    const customPath = expandPath(preferences.bunExecutablePath);
    if (existsSync(customPath)) {
      return customPath;
    }
    qmdLogger.warn("Custom Bun path not found, falling back to auto-detection", {
      customPath,
    });
  }

  const bunInHome = join(homedir(), ".bun", "bin", "bun");
  if (existsSync(bunInHome)) {
    return bunInHome;
  }

  const bunInPath = findInPath("bun");
  if (bunInPath) {
    return bunInPath;
  }

  return "bun";
}

/**
 * Get the full path to the qmd script
 */
function getQmdScript(): string {
  const preferences = getPreferenceValues<Preferences>();

  if (preferences.qmdExecutablePath) {
    const customPath = expandPath(preferences.qmdExecutablePath);
    if (existsSync(customPath)) {
      return customPath;
    }
    qmdLogger.warn("Custom QMD path not found, falling back to auto-detection", {
      customPath,
    });
  }

  const qmdInHome = join(homedir(), ".bun", "bin", "qmd");
  if (existsSync(qmdInHome)) {
    return qmdInHome;
  }

  const qmdInPath = findInPath("qmd");
  if (qmdInPath) {
    return qmdInPath;
  }

  return qmdInHome;
}

/**
 * Build a shell command that sets PATH and runs qmd
 */
function buildQmdShellCommand(args: string[]): string {
  const qmdPath = getQmdScript();
  const qmdDir = path_dirname(qmdPath);
  // Escape single quotes in args for shell safety
  const escapedArgs = args.map((arg) => `'${arg.replace(/'/g, "'\\''")}'`).join(" ");
  return `export PATH="${qmdDir}:$PATH" && qmd ${escapedArgs}`;
}

/**
 * Get QMD database path
 */
export function getQmdDatabasePath(): string {
  return join(homedir(), ".cache", "qmd", "index.sqlite");
}

/**
 * Validate if a collection path exists
 */
export function validateCollectionPath(path: string): boolean {
  // Expand ~ to home directory
  const expandedPath = path.startsWith("~") ? join(homedir(), path.slice(1)) : path;
  return existsSync(expandedPath);
}

/**
 * Expand ~ in path to full home directory path
 */
export function expandPath(path: string): string {
  return path.startsWith("~") ? join(homedir(), path.slice(1)) : path;
}

// ============================================================================
// Dependency Checks
// ============================================================================

/**
 * Check if Bun is installed
 */
export async function checkBunInstalled(): Promise<{
  installed: boolean;
  version?: string;
}> {
  const bunPath = getBunExecutable();

  // Check if bun exists at the expected path
  if (existsSync(bunPath)) {
    return { installed: true, version: "installed" };
  }

  // fallback: Try running bun to check if it's in PATH
  try {
    const { stdout } = await execAsync("bun --version", {
      timeout: 5000,
      env: getEnvWithPath(),
    });
    return { installed: true, version: stdout.trim() };
  } catch {
    return { installed: false };
  }
}

/**
 * Check if QMD is installed
 */
export function checkQmdInstalled(): {
  installed: boolean;
  version?: string;
} {
  const qmdScript = getQmdScript();

  if (!existsSync(qmdScript)) {
    return { installed: false };
  }

  return { installed: true, version: "installed" };
}

/**
 * Check if SQLite is installed (macOS only via Homebrew)
 */
export async function checkSqliteInstalled(): Promise<boolean> {
  if (platform() !== "darwin") {
    // On Windows, assume SQLite is available or let QMD handle it
    return true;
  }
  try {
    await execAsync("brew list sqlite", {
      timeout: 5000,
      env: getEnvWithPath(),
    });
    return true;
  } catch {
    // SQLite might be available system-wide even if not via Homebrew
    try {
      await execAsync("sqlite3 --version", {
        timeout: 5000,
        env: getEnvWithPath(),
      });
      return true;
    } catch {
      return false;
    }
  }
}

/**
 * Check all dependencies
 */
export async function checkAllDependencies(): Promise<DependencyStatus> {
  const [bunResult, qmdResult, sqliteInstalled] = await Promise.all([
    checkBunInstalled(),
    checkQmdInstalled(),
    checkSqliteInstalled(),
  ]);

  return {
    bunInstalled: bunResult.installed,
    qmdInstalled: qmdResult.installed,
    sqliteInstalled,
    bunVersion: bunResult.version,
    qmdVersion: qmdResult.version,
  };
}

// ============================================================================
// QMD Command Execution
// ============================================================================

/**
 * Execute a QMD command and parse JSON output
 */
export async function runQmd<T>(
  args: string[],
  options: { timeout?: number; includeJson?: boolean } = {},
): Promise<QmdResult<T>> {
  const { timeout = 30_000, includeJson = true } = options;

  try {
    const fullArgs = includeJson ? [...args, "--json"] : args;
    const command = buildQmdShellCommand(fullArgs);

    const { stdout, stderr } = await execAsync(command, {
      timeout,
      maxBuffer: 10 * 1024 * 1024, // 10MB buffer for large outputs
    });

    if (includeJson && stdout.trim()) {
      // Handle "No results found" message from qmd CLI
      if (stdout.trim().startsWith("No results")) {
        return { success: true, data: [] as unknown as T, stderr: stderr || undefined };
      }

      try {
        const data = JSON.parse(stdout) as T;
        return { success: true, data, stderr: stderr || undefined };
      } catch (parseError) {
        return {
          success: false,
          error: `Failed to parse JSON output: ${parseError instanceof Error ? parseError.message : "Unknown error"}`,
          stderr: stdout, // Include raw output for debugging
        };
      }
    }

    return {
      success: true,
      data: stdout as unknown as T,
      stderr: stderr || undefined,
    };
  } catch (error) {
    const execError = error as {
      stdout?: string;
      stderr?: string;
      message?: string;
      code?: string | number;
    };

    // Recover stdout from non-zero exit codes
    if (includeJson && execError.stdout?.trim()) {
      const trimmed = execError.stdout.trim();
      if (trimmed.startsWith("No results")) {
        return { success: true, data: [] as unknown as T, stderr: execError.stderr };
      }
      try {
        const data = JSON.parse(trimmed) as T;
        return { success: true, data, stderr: execError.stderr };
      } catch {
        // ignore
      }
    }

    return {
      success: false,
      error: execError.message || "Command execution failed",
      stderr: execError.stderr,
    };
  }
}

/**
 * Execute a QMD command without JSON parsing (for commands that don't return JSON)
 */
export async function runQmdRaw(args: string[], options: { timeout?: number } = {}): Promise<QmdResult<string>> {
  const { timeout = 30_000 } = options;

  try {
    const command = buildQmdShellCommand(args);
    const { stdout, stderr } = await execAsync(command, {
      timeout,
      maxBuffer: 10 * 1024 * 1024,
    });

    return { success: true, data: stdout, stderr: stderr || undefined };
  } catch (error) {
    const execError = error as { stdout?: string; stderr?: string; message?: string };

    // Recover stdout from non-zero exit codes
    if (execError.stdout?.trim()) {
      return { success: true, data: execError.stdout, stderr: execError.stderr };
    }

    return {
      success: false,
      error: execError.message || "Command execution failed",
      stderr: execError.stderr,
    };
  }
}

// ============================================================================
// High-Level QMD Operations (using parsers)
// ============================================================================

/**
 * Get list of collections (parses text output since --json not supported)
 */
export async function getCollections(): Promise<QmdResult<QmdCollection[]>> {
  const result = await runQmdRaw(["collection", "list"]);

  if (!result.success) {
    return { success: false, error: result.error, stderr: result.stderr };
  }

  const collections = parseCollectionList(result.data || "");

  // Merge paths from config file
  const paths = getCollectionPaths();
  for (const collection of collections) {
    if (paths[collection.name]) {
      collection.path = paths[collection.name];
    }
  }

  return { success: true, data: collections };
}

/**
 * Get list of contexts (parses text output since --json not supported)
 */
export async function getContexts(): Promise<QmdResult<QmdContext[]>> {
  const result = await runQmdRaw(["context", "list"]);

  if (!result.success) {
    return { success: false, error: result.error, stderr: result.stderr };
  }

  const contexts = parseContextList(result.data || "");
  return { success: true, data: contexts };
}

/**
 * Get list of files in a collection (parses text output since --json not supported)
 */
export async function getCollectionFiles(collectionName: string): Promise<QmdResult<QmdFileListItem[]>> {
  const result = await runQmdRaw(["ls", collectionName]);

  if (!result.success) {
    return { success: false, error: result.error, stderr: result.stderr };
  }

  const files = parseFileList(result.data || "");
  return { success: true, data: files };
}

// ============================================================================
// Embedding
// ============================================================================

/**
 * Run embedding process
 */
export async function runEmbed(collectionName?: string): Promise<QmdResult<string>> {
  const args = ["embed"];
  if (collectionName) {
    args.push("-c", collectionName);
  }

  return await runQmdRaw(args, { timeout: 300_000 }); // 5 minute timeout
}

/**
 * Result from updating collections
 */
export interface UpdateResult {
  success: boolean;
  output: string;
  pendingEmbeddings: number;
  error?: string;
}

/**
 * Run update for all collections or a specific collection
 * Parses output to detect if embeddings are needed
 */
export async function runUpdate(collectionName?: string, options: { pullFirst?: boolean } = {}): Promise<UpdateResult> {
  const args = ["update"];
  if (collectionName) {
    args.push("-c", collectionName);
  }
  if (options.pullFirst) {
    args.push("--pull");
  }

  const result = await runQmdRaw(args, { timeout: 120_000 }); // 2 minute timeout

  if (!result.success) {
    return {
      success: false,
      output: "",
      pendingEmbeddings: 0,
      error: result.error,
    };
  }

  const output = result.data || "";

  // Parse the output to find pending embeddings count
  // Format: "Run 'qmd embed' to update embeddings (4 unique hashes need vectors)"
  const pendingMatch = output.match(PENDING_EMBEDDINGS_PATTERN);
  const pendingEmbeddings = pendingMatch ? Number.parseInt(pendingMatch[1], 10) : 0;

  return {
    success: true,
    output,
    pendingEmbeddings,
  };
}

/**
 * Check if embedding is currently running
 * Note: This cannot detect embedding running in other command contexts
 */
export function isEmbedRunning(): boolean {
  return false;
}

// ============================================================================
// Score Utilities
// ============================================================================

/**
 * Get score color based on relevance
 */
export function getScoreColor(score: number): ScoreColor {
  if (score > 0.7) {
    return "green";
  }
  if (score >= 0.4) {
    return "yellow";
  }
  return "red";
}

/**
 * Format score as percentage string
 */
export function formatScorePercentage(score: number): string {
  return `${Math.round(score * 100)}%`;
}

/**
 * Get Raycast color for score
 */
export function getScoreRaycastColor(score: number): string {
  const color = getScoreColor(score);
  switch (color) {
    case "green":
      return "#34C759";
    case "yellow":
      return "#FF9500";
    case "red":
      return "#FF3B30";
    default:
      return "#FF3B30";
  }
}

// ============================================================================
// Installation Utilities
// ============================================================================

/**
 * Install QMD via Bun
 */
export async function installQmd(): Promise<QmdResult<string>> {
  try {
    const { stdout, stderr } = await execAsync("bun install -g https://github.com/tobi/qmd", {
      timeout: 120_000, // 2 minute timeout for installation
      env: getEnvWithPath(),
    });
    return { success: true, data: stdout, stderr };
  } catch (error) {
    const execError = error as { stderr?: string; message?: string };
    return {
      success: false,
      error: execError.message || "Installation failed",
      stderr: execError.stderr,
    };
  }
}

/**
 * Install SQLite via Homebrew (macOS only)
 */
export async function installSqlite(): Promise<QmdResult<string>> {
  if (platform() !== "darwin") {
    return {
      success: false,
      error: "SQLite installation via Homebrew is only available on macOS",
    };
  }

  try {
    const { stdout, stderr } = await execAsync("brew install sqlite", {
      timeout: 300_000, // 5 minute timeout
      env: getEnvWithPath(),
    });
    return { success: true, data: stdout, stderr };
  } catch (error) {
    const execError = error as { stderr?: string; message?: string };
    return {
      success: false,
      error: execError.message || "Installation failed",
      stderr: execError.stderr,
    };
  }
}
