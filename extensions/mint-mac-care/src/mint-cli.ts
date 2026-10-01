import { execFile, spawn, spawnSync } from "node:child_process";
import { existsSync, realpathSync } from "node:fs";
import { homedir } from "node:os";

export const MINT_TEAM_ID = "DRV5ZMT5U8";
export const MINIMUM_SCHEMA_VERSION = 2;

// cli.native.v1 is where Organize and Optimize reach the surface (Mint 1.0.72).
const REQUIRED_CAPABILITIES = ["scan-lite.v1", "status.v1", "why.v1", "surface.v1", "agents.v1", "cli.native.v1"];
// 1.0.72 to 1.0.79 carry the same capabilities, and before 1.0.73 every
// removal a free person started was refused. Only the CLI inside Mint.app
// knows its app's version; the copy Mint puts in Homebrew's bin does not.
export const MINIMUM_APP_VERSION = "1.0.80";
const BUNDLED_CLI = "/Applications/Mint.app/Contents/Resources/mint-cli";
export const MINT_BUNDLE_ID = "com.mint.app";
export const MINT_DOWNLOAD_URL = "https://mintstorage.app/r/raycast-download";
export const MINT_WEBSITE_URL = "https://mintstorage.app/r/raycast";
const SIGNING_REQUIREMENT = `=anchor apple generic and identifier "mint-cli" and certificate leaf[subject.OU] = "${MINT_TEAM_ID}"`;
const inFlightSurfaceRequests = new Map<string, Promise<MintSurfaceResponse>>();

export type MintCommandCapability = "scan-lite.v1" | "status.v1" | "why.v1" | "surface.v1";

export type MintCommandEnvelope = {
  schemaVersion: number;
  capability: MintCommandCapability;
  error?: string;
};

export type MintCLIVersion = {
  product?: string;
  appVersion?: string;
  appBuild?: string;
  schemaVersion?: number;
  capabilities?: string[];
};

export type MintCLIResolution =
  { status: "ready"; path: string; version: MintCLIVersion } | { status: "not-found" | "untrusted" | "incompatible" };

export type MintSurfaceRequest = {
  schemaVersion: 2;
  action: string;
  sessionID?: string;
  itemIDs?: string[];
  agentIDs?: string[];
  batchID?: string;
  path?: string;
  outputPath?: string;
  includeExactDuplicates?: boolean;
  includeSimilarPhotos?: boolean;
  includeAgentArchives?: boolean;
  allowAdvanced?: boolean;
  allowAdmin?: boolean;
  confirmed?: boolean;
  permanent?: boolean;
  confirmReview?: boolean;
  mode?: string;
  /** Mint 1.0.81 writes this request's progress to a file named by it. */
  progressToken?: string;
};

export type MintSurfaceResponse = MintCommandEnvelope & {
  capability: "surface.v1";
  action?: string;
  ok: boolean;
  [key: string]: unknown;
};

function cliCandidates(): string[] {
  return [process.env.MINT_CLI_PATH, BUNDLED_CLI, "/opt/homebrew/bin/mint-cli", "/usr/local/bin/mint-cli"].filter(
    (candidate): candidate is string => Boolean(candidate),
  );
}

export function verifyMintCLISignature(path: string): boolean {
  const result = spawnSync(
    "/usr/bin/codesign",
    ["--verify", "--strict", "--test-requirement", SIGNING_REQUIREMENT, path],
    { encoding: "utf8", timeout: 5_000 },
  );
  return result.status === 0 && !result.error;
}

export function readMintCLIVersion(path: string): MintCLIVersion | undefined {
  const result = spawnSync(path, ["version", "--json"], {
    encoding: "utf8",
    timeout: 5_000,
    maxBuffer: 256 * 1024,
  });
  if (result.status !== 0 || result.error) return undefined;
  return parseJSON<MintCLIVersion>(result.stdout || undefined);
}

/** Whether a version like "1.0.80" is at least `minimum`; anything unreadable is not. */
export function isAtLeastVersion(version: string, minimum: string): boolean {
  const parse = (value: string) => value.split(".").map((part) => Number.parseInt(part, 10));
  const have = parse(version);
  const need = parse(minimum);
  if (have.some((part) => !Number.isFinite(part))) return false;
  for (let index = 0; index < Math.max(have.length, need.length); index += 1) {
    const a = have[index] ?? 0;
    const b = need[index] ?? 0;
    if (a !== b) return a > b;
  }
  return true;
}

/**
 * The CLI answers for this extension: Mint, the schema, every capability,
 * and Mint 1.0.80 or later when it says its version. A copy that cannot say
 * (outside Mint.app) is judged by what Mint.app said, in resolveMintCLI.
 */
export function isCompatibleMintCLIVersion(version: MintCLIVersion | undefined): version is MintCLIVersion {
  return Boolean(
    version?.product === "Mint" &&
    Number.isInteger(version.schemaVersion) &&
    (version.schemaVersion ?? 0) >= MINIMUM_SCHEMA_VERSION &&
    REQUIRED_CAPABILITIES.every((capability) => version.capabilities?.includes(capability)) &&
    (version.appVersion === undefined || isAtLeastVersion(version.appVersion, MINIMUM_APP_VERSION)),
  );
}

export function resolveMintCLI(): MintCLIResolution {
  let sawUntrusted = false;
  let sawIncompatible = false;
  // Mint.app said it is older than the minimum: a copy that cannot say its
  // version came from that app.
  let appTooOld = false;
  const checkedPaths = new Set<string>();

  for (const candidate of cliCandidates()) {
    if (!existsSync(candidate)) continue;

    let resolved = candidate;
    try {
      resolved = realpathSync(candidate);
    } catch {
      // codesign will reject unreadable or unresolved candidates below.
    }
    if (checkedPaths.has(resolved)) continue;
    checkedPaths.add(resolved);

    if (!verifyMintCLISignature(resolved)) {
      sawUntrusted = true;
      continue;
    }

    const version = readMintCLIVersion(resolved);
    if (version?.appVersion !== undefined && !isAtLeastVersion(version.appVersion, MINIMUM_APP_VERSION)) {
      appTooOld = true;
    }
    if (!isCompatibleMintCLIVersion(version) || (appTooOld && version.appVersion === undefined)) {
      sawIncompatible = true;
      continue;
    }

    return { status: "ready", path: resolved, version };
  }

  if (sawIncompatible) return { status: "incompatible" };
  if (sawUntrusted) return { status: "untrusted" };
  return { status: "not-found" };
}

export function canRevalidateMintCLI(
  currentPath: string | undefined,
  nextResolution: MintCLIResolution,
): nextResolution is Extract<MintCLIResolution, { status: "ready" }> {
  return Boolean(currentPath && nextResolution.status === "ready" && nextResolution.path === currentPath);
}

export function parseJSON<T>(value: string | undefined): T | undefined {
  if (!value) return undefined;

  try {
    return JSON.parse(value) as T;
  } catch {
    return undefined;
  }
}

export function parseMintCommandJSON<T extends object>(
  value: string | undefined,
  expectedCapability: MintCommandCapability,
): (T & MintCommandEnvelope) | undefined {
  const payload = parseJSON<Record<string, unknown>>(value);
  if (
    !payload ||
    typeof payload.schemaVersion !== "number" ||
    !Number.isInteger(payload.schemaVersion) ||
    payload.schemaVersion < MINIMUM_SCHEMA_VERSION ||
    payload.capability !== expectedCapability
  ) {
    return undefined;
  }
  return payload as T & MintCommandEnvelope;
}

export function runMintSurface<T extends object>(
  cliPath: string,
  request: Omit<MintSurfaceRequest, "schemaVersion">,
  timeout = 20 * 60_000,
): Promise<T & MintSurfaceResponse> {
  const payload = JSON.stringify({ schemaVersion: 2, ...request });
  const requestKey = `${cliPath}\u0000${payload}`;
  const existing = inFlightSurfaceRequests.get(requestKey);
  if (existing) return existing as Promise<T & MintSurfaceResponse>;

  const encoded = Buffer.from(payload, "utf8").toString("base64");
  const operation = new Promise<T & MintSurfaceResponse>((resolve, reject) => {
    if (!verifyMintCLISignature(cliPath)) {
      reject(new Error("Mint CLI signature could not be verified before this action."));
      return;
    }
    execFile(
      cliPath,
      ["surface", "--request-base64", encoded],
      { encoding: "utf8", timeout, maxBuffer: 32 * 1024 * 1024 },
      (error, stdout, stderr) => {
        const response = parseMintCommandJSON<T & MintSurfaceResponse>(stdout || undefined, "surface.v1");
        if (response) {
          if (!response.ok) {
            reject(new Error(response.error || "Mint could not complete this action."));
          } else {
            resolve(response);
          }
          return;
        }
        const detail = stderr?.trim() || error?.message || "Mint returned an invalid surface response.";
        reject(new Error(detail));
      },
    );
  });
  inFlightSurfaceRequests.set(requestKey, operation as Promise<MintSurfaceResponse>);
  void operation.then(
    () => {
      if (inFlightSurfaceRequests.get(requestKey) === operation) inFlightSurfaceRequests.delete(requestKey);
    },
    () => {
      if (inFlightSurfaceRequests.get(requestKey) === operation) inFlightSurfaceRequests.delete(requestKey);
    },
  );
  return operation;
}

/**
 * Sizes the way Mint writes them: decimal units, as Finder and the app do, so
 * a number here matches the same number in Mint's window.
 */
export function formatBytes(bytes = 0): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 B";

  const units = ["B", "KB", "MB", "GB", "TB"];
  const decimals = [0, 0, 1, 2, 2];
  const unit = Math.min(Math.floor(Math.log10(bytes) / 3), units.length - 1);
  const value = bytes / 1000 ** unit;
  const rounded = Number(value.toFixed(decimals[unit]));
  // 999.96 MB rounds to 1000 MB; say 1 GB instead.
  if (rounded >= 1000 && unit < units.length - 1) return formatBytes(1000 ** (unit + 1));
  return `${rounded} ${units[unit]}`;
}

/** The menu bar dropdown's sizes (formatBytesCompact): one decimal for GB. */
export function formatCompact(bytes = 0): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 B";
  if (bytes >= 1e9) return `${(bytes / 1e9).toFixed(1)} GB`;
  if (bytes >= 1e6) return `${Math.round(bytes / 1e6)} MB`;
  if (bytes >= 1e3) return `${Math.round(bytes / 1e3)} KB`;
  return `${Math.round(bytes)} B`;
}

export function formatSignedBytes(bytes = 0): string {
  if (!Number.isFinite(bytes) || bytes === 0) return "0 B";
  return `${bytes > 0 ? "+" : "−"}${formatBytes(Math.abs(bytes))}`;
}

export function escapeMarkdown(value: string | undefined): string {
  return (value ?? "").replace(/([\\`*_[\]{}<>|])/g, "\\$1").replace(/\r?\n/g, " ");
}

export function shortPath(path: string, home = homedir()): string {
  if (!home) return path;
  if (path === home) return "~";
  return path.startsWith(`${home}/`) ? `~${path.slice(home.length)}` : path;
}

export function plural(count: number, one: string, many = `${one}s`): string {
  return `${count.toLocaleString("en-US")} ${count === 1 ? one : many}`;
}

/** Opens Mint by its bundle identifier, wherever it is installed. */
export function openMint(): void {
  const child = spawn("/usr/bin/open", ["-b", MINT_BUNDLE_ID], { detached: true, stdio: "ignore" });
  child.on("error", () => undefined);
  child.unref();
}
