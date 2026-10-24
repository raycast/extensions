import { getPreferenceValues } from "@raycast/api";
import { execFile } from "node:child_process";
import { existsSync } from "node:fs";
import { homedir } from "node:os";

/** Where `hub` might live, best first. The app bundle comes before PATH so
 *  GitHub's older, unrelated `hub` tool can't be picked by mistake. */
function candidates(): string[] {
  const { hubPath } = getPreferenceValues<{ hubPath?: string }>();
  const home = homedir();
  return [
    hubPath?.trim().replace(/^~(?=$|\/)/, home) ?? "",
    "/Applications/OfficeSpace.app/Contents/MacOS/hub",
    `${home}/Applications/OfficeSpace.app/Contents/MacOS/hub`,
    `${home}/.local/bin/hub`,
    "/opt/homebrew/bin/hub",
    "/usr/local/bin/hub",
  ].filter((path) => path.length > 0);
}

export class HubNotFoundError extends Error {
  constructor() {
    super("Office Space isn't installed, or hub couldn't be found. Set its path in the extension's preferences.");
    this.name = "HubNotFoundError";
  }
}

/** The oldest Office Space whose hub has everything this extension uses. */
export const MIN_APP_VERSION = "0.2.0";

export class OutdatedAppError extends Error {
  constructor(version?: string) {
    super(
      `This extension needs Office Space ${MIN_APP_VERSION} or later${version ? ` (you have ${version})` : ""}. ` +
        "Update it from Office Space → Settings → General → Updates.",
    );
    this.name = "OutdatedAppError";
  }
}

/** "0.2.0" < "0.10.0"; pre-releases sort before their release. */
export function compareVersions(a: string, b: string): number {
  const parse = (text: string) => {
    const [core, pre] = text.replace(/^v/i, "").split("-", 2);
    return { parts: core.split(".").map((part) => Number(part) || 0), pre };
  };
  const left = parse(a);
  const right = parse(b);
  for (let i = 0; i < Math.max(left.parts.length, right.parts.length); i++) {
    const difference = (left.parts[i] ?? 0) - (right.parts[i] ?? 0);
    if (difference !== 0) return difference;
  }
  if (left.pre === right.pre) return 0;
  if (left.pre === undefined) return 1;
  if (right.pre === undefined) return -1;
  return left.pre.localeCompare(right.pre, undefined, { numeric: true });
}

let resolved: string | undefined;
let compatibility: Promise<void> | undefined;

export function hubPath(): string {
  if (resolved) return resolved;
  const found = candidates().find((path) => existsSync(path));
  if (!found) throw new HubNotFoundError();
  resolved = found;
  return found;
}

/** Checks once per command run that the installed app is new enough.
 *  Development builds ("-dev") are assumed current. */
function ensureCompatible(): Promise<void> {
  compatibility ??= run<{ version: string }>(["version"]).then(({ version }) => {
    if (!version.endsWith("-dev") && compareVersions(version, MIN_APP_VERSION) < 0) throw new OutdatedAppError(version);
  });
  return compatibility;
}

/** Runs `hub <args> --json` and parses its one JSON value. hub prints
 *  `{"error": "…"}` and exits 1 on failure; that becomes a thrown Error. */
export async function hub<T>(args: string[], options: { input?: string; timeout?: number } = {}): Promise<T> {
  await ensureCompatible();
  return run<T>(args, options);
}

function run<T>(args: string[], options: { input?: string; timeout?: number } = {}): Promise<T> {
  const path = hubPath();
  return new Promise((resolve, reject) => {
    const child = execFile(
      path,
      [...args, "--json"],
      { timeout: options.timeout ?? 20_000, maxBuffer: 32 * 1024 * 1024 },
      (error, stdout, stderr) => {
        const text = stdout.trim();
        let parsed: unknown;
        try {
          parsed = text ? JSON.parse(text) : undefined;
        } catch {
          parsed = undefined;
        }
        if (parsed && typeof parsed === "object" && "error" in parsed && typeof parsed.error === "string") {
          reject(new Error(parsed.error));
        } else if (error) {
          const message = (stderr || text || error.message).replace(/^hub: /, "").trim();
          // An older hub doesn't know the command (or --json).
          reject(/^Unknown (skills )?command/i.test(message) ? new OutdatedAppError() : new Error(message));
        } else if (parsed === undefined) {
          reject(new OutdatedAppError());
        } else {
          resolve(parsed as T);
        }
      },
    );
    if (options.input !== undefined) {
      child.stdin?.end(options.input);
    }
  });
}
