import { spawnSync } from "node:child_process";
import { existsSync, realpathSync } from "node:fs";
import { homedir } from "node:os";

export const MINT_TEAM_ID = "DRV5ZMT5U8";
export const MINIMUM_SCHEMA_VERSION = 2;

const REQUIRED_CAPABILITIES = ["scan-lite.v1", "status.v1", "why.v1"];
const SIGNING_REQUIREMENT = `=anchor apple generic and identifier "mint-cli" and certificate leaf[subject.OU] = "${MINT_TEAM_ID}"`;

export type MintCommandCapability = "scan-lite.v1" | "status.v1" | "why.v1";

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

function cliCandidates(): string[] {
  return [
    process.env.MINT_CLI_PATH,
    "/opt/homebrew/bin/mint-cli",
    "/usr/local/bin/mint-cli",
    "/Applications/Mint.app/Contents/Resources/mint-cli",
  ].filter((candidate): candidate is string => Boolean(candidate));
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

export function isCompatibleMintCLIVersion(version: MintCLIVersion | undefined): version is MintCLIVersion {
  return Boolean(
    version?.product === "Mint" &&
    Number.isInteger(version.schemaVersion) &&
    (version.schemaVersion ?? 0) >= MINIMUM_SCHEMA_VERSION &&
    REQUIRED_CAPABILITIES.every((capability) => version.capabilities?.includes(capability)),
  );
}

export function resolveMintCLI(): MintCLIResolution {
  let sawUntrusted = false;
  let sawIncompatible = false;
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
    if (!isCompatibleMintCLIVersion(version)) {
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

export function formatBytes(bytes = 0): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 B";

  const units = ["B", "KB", "MB", "GB", "TB"];
  const unit = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / 1024 ** unit;
  return `${value.toFixed(value >= 10 || unit === 0 ? 0 : 1)} ${units[unit]}`;
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
