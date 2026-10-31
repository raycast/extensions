import { getPreferenceValues } from "@raycast/api";
import { execFile } from "node:child_process";
import { mkdtemp, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { setTimeout as sleep } from "node:timers/promises";
import { Profile } from "./types";

const DEFAULT_CLI_PATH = "/Applications/Pritunl.app/Contents/Resources/pritunl-client";
const COMMAND_TIMEOUT_MS = 30_000;
// execFile's own default. Logs keep growing across connections and need more.
const DEFAULT_MAX_BUFFER = 1024 * 1024;
const LOGS_MAX_BUFFER = 64 * 1024 * 1024;

export class PritunlError extends Error {
  constructor(
    message: string,
    readonly missingCli = false,
  ) {
    super(message);
    this.name = "PritunlError";
  }
}

function cliPath(): string {
  const { cliPath } = getPreferenceValues<Preferences>();
  return cliPath?.trim() || DEFAULT_CLI_PATH;
}

// The CLI prints "Error: <message>" followed by a Go stack trace. Only the first line is worth showing.
function cleanError(stderr: string): string {
  const firstLine = stderr.trim().split("\n")[0] ?? "";
  return firstLine.replace(/^Error:\s*/, "");
}

function run(args: string[], { maxBuffer = DEFAULT_MAX_BUFFER } = {}): Promise<string> {
  const path = cliPath();

  return new Promise((resolve, reject) => {
    const child = execFile(path, args, { timeout: COMMAND_TIMEOUT_MS, maxBuffer }, (error, stdout, stderr) => {
      if (!error) {
        resolve(stdout);
      } else if ("code" in error && error.code === "ENOENT") {
        reject(new PritunlError(`Couldn't find pritunl-client at ${path}`, true));
      } else if ("code" in error && error.code === "ERR_CHILD_PROCESS_STDIO_MAXBUFFER") {
        reject(new PritunlError(`pritunl-client ${args[0]} printed more than ${maxBuffer / 1024 / 1024} MB`));
      } else if (error.killed) {
        reject(new PritunlError(`pritunl-client ${args[0]} took too long to respond`));
      } else {
        reject(new PritunlError(cleanError(stderr) || error.message));
      }
    });

    // Profiles with a password mode make `start` prompt on stdin. Closing it makes the
    // command fail fast instead of hanging until the timeout.
    child.stdin?.end();
  });
}

export async function listProfiles(): Promise<Profile[]> {
  const output = await run(["list", "-j"]);
  return JSON.parse(output) as Profile[];
}

/**
 * Asks the client to connect. Resolves before the tunnel is up, so follow it with
 * `waitForConnection`. For SSO profiles the CLI prints a sign-in link, which is returned
 * so the caller can open it.
 */
export async function connect(id: string): Promise<{ ssoUrl?: string }> {
  const output = await run(["start", id]);
  return { ssoUrl: output.match(/https?:\/\/\S+/)?.[0] };
}

/**
 * Whether the Pritunl app is open. The app opens the SSO sign-in page by itself, so
 * opening it again here would give two browser tabs.
 */
export function isAppRunning(): Promise<boolean> {
  return new Promise((resolve) => {
    execFile("/usr/bin/pgrep", ["-x", "Pritunl"], { timeout: 3000 }, (error) => resolve(!error));
  });
}

export async function disconnect(id: string): Promise<void> {
  await run(["stop", id]);
}

export async function getLogs(id: string): Promise<string> {
  return run(["logs", id], { maxBuffer: LOGS_MAX_BUFFER });
}

// Profile links carry the key that downloads the profile, so they never appear in messages.
function redactLinks(message: string): string {
  return message.replace(/\b(pritunl|https?):\/\/\S+/gi, "<profile link>");
}

async function addOne(source: string): Promise<void> {
  try {
    await run(["add", source, "--user"]);
  } catch (error) {
    if (error instanceof PritunlError) {
      // "sprofile: Request failed" names the client's internal module, which means nothing here.
      throw new PritunlError(redactLinks(error.message.replace(/^sprofile:\s*/, "")), error.missingCli);
    }
    throw error;
  }
}

function unzipProfiles(zipPath: string, dir: string): Promise<void> {
  return new Promise((resolve, reject) => {
    // -j drops the paths stored in the zip, so nothing can be written outside `dir`.
    execFile("/usr/bin/unzip", ["-j", "-qq", zipPath, "*.ovpn", "*.conf", "-d", dir], { timeout: 15_000 }, (error) => {
      // Exit code 11 means no file matched, which the caller reports.
      if (error && error.code !== 11) reject(new PritunlError("Couldn't open the zip file"));
      else resolve();
    });
  });
}

/**
 * `pritunl-client` can't read zip files, so their `.ovpn` and `.conf` files are unpacked to
 * a private temporary folder and imported one by one. The folder holds keys, so it's always
 * deleted afterwards.
 */
async function addFromZip(zipPath: string): Promise<void> {
  const dir = await mkdtemp(join(tmpdir(), "pritunl-import-"));
  try {
    await unzipProfiles(zipPath, dir);
    // Zips made by Finder add "._" metadata files next to each real one.
    const files = (await readdir(dir)).filter((name) => !name.startsWith("._") && /\.(ovpn|conf)$/i.test(name));
    if (files.length === 0) throw new PritunlError("The zip file has no .ovpn or .conf profiles");

    const errors: unknown[] = [];
    for (const file of files) {
      await addOne(join(dir, file)).catch((error) => errors.push(error));
    }
    // Some profiles making it in is still a success. The caller reports what was added.
    if (errors.length === files.length) throw errors[0];
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

/**
 * Imports profiles from a profile link or a `.tar`, `.zip`, `.ovpn` or `.conf` file. A link
 * or archive can hold one profile per server, so this can add more than one. They're added
 * as user profiles, like the Pritunl app does, so they belong to this macOS account only.
 */
export async function addProfile(source: string): Promise<void> {
  if (/\.zip$/i.test(source)) return addFromZip(source);
  return addOne(source);
}

export async function removeProfile(id: string): Promise<void> {
  await run(["remove", id]);
}

export async function setAutostart(id: string, enabled: boolean): Promise<void> {
  await run([enabled ? "enable" : "disable", id]);
}

/**
 * Polls until the profile reaches the wanted state. Returns undefined on timeout. When
 * waiting to connect, it also stops once a started connection is no longer running, such
 * as after it was cancelled, and returns that disconnected profile.
 */
export async function waitForConnection(
  id: string,
  connected: boolean,
  timeoutMs: number,
): Promise<Profile | undefined> {
  const deadline = Date.now() + timeoutMs;
  // The client can take a moment to mark a new connection as running.
  let seenRunning = false;

  while (Date.now() < deadline) {
    const profile = (await listProfiles()).find((p) => p.id === id);
    if (profile?.connected === connected) {
      return profile;
    }
    if (connected && profile) {
      if (profile.run_state === "Active") seenRunning = true;
      else if (seenRunning) return profile;
    }
    await sleep(1000);
  }

  return undefined;
}
