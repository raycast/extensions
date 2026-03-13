import path from "path";
import fs from "fs";
import { useStoragePath } from "./hooks/useStoragePath";
import { useBinaryPath } from "./hooks/useBinaryPath";
import { homedir } from "os";
import { environment } from "@raycast/api";
import { spawnSync } from "child_process";
import { useGithubToken } from "./hooks/useGithubToken";

export interface LaravelTip {
  id: number;
  title: string;
  content: string;
}

export class ExecutionError extends Error {}

export interface ExecutionResult<T> {
  data?: T;
  error?: ExecutionError;
}

/**
 * Get a random tip
 *
 * when no tips are found, it will return an empty object
 */
export async function random(): Promise<ExecutionResult<LaravelTip>> {
  const { data, error } = await execute("random", []);

  if (error) {
    return { error };
  }

  if (!data || data.length == 0) {
    return { data: {} as LaravelTip };
  }

  return { data: data[0] };
}

/**
 * Search for tips
 *
 * @param searchText
 */
export async function search(searchText: string): Promise<ExecutionResult<LaravelTip[]>> {
  const { data, error } = await execute("search", [searchText]);

  if (error) {
    return { error };
  }

  return { data: data || [] };
}

/**
 * Start syncing all tips from LaravelDaily Repo, all data will be overwritten
 * when you run this command again.
 */
export async function sync(): Promise<ExecutionResult<void>> {
  const { error } = await execute("sync", []);

  if (error) {
    return { error };
  }

  return {};
}

/**
 * Execute a command with the given arguments
 *
 * @param command
 * @param args
 */
export async function execute(command: string, args: string[]): Promise<ExecutionResult<LaravelTip[]>> {
  // If the data synchronization has not yet been performed, try to sync it first
  // This usually happens when the user has just installed the extension
  if (command !== "sync" && !(await detectDatabaseFileHasExists())) {
    const { error } = await sync();
    if (error) {
      return { error };
    }
  }

  const { data: binaryPath } = await formatBinaryPath(useBinaryPath());
  if (!binaryPath) {
    return { error: new ExecutionError("Could not find laraveltips binary") };
  }

  const { data, error } = await spawn(binaryPath, command, args);

  if (error) {
    return { error };
  }

  return { data: data ? JSON.parse(data) : [] };
}

/**
 * Spawn a process with the given binary path, command and arguments
 *
 * @param binaryPath
 * @param command
 * @param args
 */
async function spawn(binaryPath: string, command: string, args: string[]): Promise<ExecutionResult<string>> {
  const storagePath = useStoragePath();
  const options = ["-o", "json", "-q"];

  if (storagePath) {
    options.push("--path", formatStoragePath(storagePath));
  }

  options.push(command, ...args);

  const { status, stdout, stderr } = spawnSync(binaryPath, options, {
    env: prepareEnvironment(),
  });

  if (status !== 0) {
    return { error: new ExecutionError(stderr.toString()) };
  }

  return { data: stdout.toString() };
}

/**
 * Prepare environment variables for the laraveltips binary
 *
 * Why we need this? Sometimes we can't fetch any data from GitHub API, because of the rate limit.
 * API rate limit exceeded for your IP address (But here's the good news: Authenticated requests get a higher rate limit.
 * Check out the documentation for more details).
 *
 * @see https://docs.github.com/rest/overview/resources-in-the-rest-api#rate-limiting
 */
function prepareEnvironment(): NodeJS.ProcessEnv | undefined {
  const token = useGithubToken();
  if (token) {
    return { LARAVEL_TIPS_ACCESS_TOKEN: token };
  }

  return undefined;
}

/**
 * Detect if the database file exists, if not, we need to sync the data from the remote server
 * when user run the command for the first time.
 */
async function detectDatabaseFileHasExists(): Promise<boolean> {
  const storagePath = formatStoragePath(useStoragePath());

  // keep the SQLite file name in sync with the laravel-tips package
  // See: https://github.com/godruoyi/laravel-tips/blob/master/src/storage/sqlite.rs#L33
  const files = [".db3", ".laraveltips.db3"];

  for (const file of files) {
    try {
      await fs.promises.access(path.join(storagePath, file), fs.constants.F_OK);

      return true;
      // eslint-disable-next-line no-empty
    } catch {}
  }

  return false;
}

/**
 * Format storage path, replacing ~ and $HOME with the actual home directory.
 * example:
 *  ~/.laravel -> /Users/username/.laravel
 *  $HOME/.laravel -> /Users/username/.laravel
 *
 *  Note: when the path is empty, we use ~/.laravel as default
 *
 * @param storagePath
 */
function formatStoragePath(storagePath: string): string {
  if (!storagePath || storagePath.trim() == "") {
    storagePath = "~/.laravel";
  }

  let fullPath = storagePath.replace(/^~($|\/|\\)/, `${homedir()}$1`);
  fullPath = fullPath.replace(/\$(\w+)/g, (_, p1) => process.env[p1] || "");

  const p = path.resolve(fullPath);
  console.log("storagePath", p);

  return p;
}

/**
 * When no binary path is provided, use the built-in binary, also we try to make sure
 * the binary is executable.
 *
 * @param binaryPath
 */
async function formatBinaryPath(binaryPath: string): Promise<ExecutionResult<string>> {
  // no binary path provided? use built-in binary
  if (!binaryPath || binaryPath.trim() == "") {
    binaryPath = `${environment.assetsPath}/laraveltips`;
  }

  await detect(binaryPath);

  return { data: path.resolve(binaryPath) };
}

/**
 * Detect if the binary is executable, if not, make it executable.
 *
 * @param binary
 */
async function detect(binary: string): Promise<void> {
  try {
    await fs.promises.access(binary, fs.constants.X_OK);
  } catch {
    await fs.promises.chmod(binary, 0o775);
  }
}
