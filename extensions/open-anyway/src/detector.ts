import { execFile } from "node:child_process";
import { promisify } from "node:util";
import path from "node:path";
import { DETECTION_TIMEOUT_MS, LOG_LOOKBACK_WINDOW } from "./constants";

const execFileAsync = promisify(execFile);

export interface BlockedAppCandidate {
  bundleId?: string;
  pathKey?: string;
  timestamp?: string;
}

export interface DetectedAppInfo {
  name: string;
  bundleId?: string;
  appPath?: string;
  timestamp?: string;
}

export interface UnifiedLogEvent {
  eventMessage?: string;
  timestamp?: string;
  subsystem?: string;
  category?: string;
}

/**
 * Validates that a string is a legitimate reverse-DNS bundle identifier.
 * Rejects null/nil representations from logs, empty values, or malformed strings.
 */
export function isValidBundleId(id?: string | null): boolean {
  if (!id) return false;
  let trimmed = id.trim();
  if (trimmed.startsWith("(") && trimmed.endsWith(")")) {
    trimmed = trimmed.slice(1, -1).trim();
  }
  if (!trimmed) return false;

  const lower = trimmed.toLowerCase();
  if (lower === "null" || lower === "(null" || lower === "null)" || lower === "nil" || lower === "unknown") {
    return false;
  }

  return /^[a-zA-Z0-9](?:[a-zA-Z0-9-]*[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]*[a-zA-Z0-9])?)+$/.test(trimmed);
}

/**
 * Parses unified log events from syspolicyd to identify active Gatekeeper denial breadcrumbs.
 * When macOS blocks an untrusted app, syspolicyd writes:
 *   "Adding Gatekeeper denial breadcrumb (open): PST: (path: ...), (team: ...), (id: <bundle_id>), (bundle_id: <bundle_id>)"
 * When the user approves or clears it:
 *   "Clearing Gatekeeper denial breadcrumb: PST: (path: ...)"
 *
 * This function is pure and deterministic for testability.
 */
export function parseGatekeeperEvents(events: UnifiedLogEvent[]): BlockedAppCandidate | null {
  if (!Array.isArray(events) || events.length === 0) {
    return null;
  }

  const activeBreadcrumbs = new Map<string, BlockedAppCandidate>();

  for (const ev of events) {
    const msg = ev.eventMessage || "";

    // Extract path key if present: e.g. "(path: 9ecfec0bb6ea4594)"
    const pathMatch = msg.match(/\(path:\s*([^)]+)\)/);
    let rawPath = pathMatch ? pathMatch[1].trim() : undefined;
    if (rawPath?.startsWith("(")) rawPath = rawPath.slice(1).trim();
    if (rawPath?.endsWith(")")) rawPath = rawPath.slice(0, -1).trim();
    const pathKey =
      rawPath && rawPath.toLowerCase() !== "null" && rawPath !== "(null)" && rawPath !== "nil" && rawPath !== "unknown"
        ? rawPath
        : undefined;

    if (msg.includes("Adding Gatekeeper denial breadcrumb")) {
      // Extract bundle ID or id: e.g. "(bundle_id: com.example.app)" or "(bundle_id: (null))"
      let bundleId: string | undefined;
      const bundleMatch = msg.match(/\(bundle_id:\s*([^)]+)\)/) || msg.match(/\(id:\s*([^)]+)\)/);
      if (bundleMatch) {
        let raw = bundleMatch[1].trim();
        if (raw.startsWith("(") && raw.endsWith(")")) {
          raw = raw.slice(1, -1).trim();
        }
        if (isValidBundleId(raw)) {
          bundleId = raw;
        }
      }

      const key = pathKey || bundleId;
      if (key) {
        activeBreadcrumbs.set(key, {
          bundleId,
          pathKey,
          timestamp: ev.timestamp,
        });
      }
    } else if (msg.includes("Clearing Gatekeeper denial breadcrumb")) {
      if (pathKey && activeBreadcrumbs.has(pathKey)) {
        activeBreadcrumbs.delete(pathKey);
      }
    }
  }

  if (activeBreadcrumbs.size === 0) {
    return null;
  }

  // Return the most recent active denial breadcrumb
  const candidates = Array.from(activeBreadcrumbs.values());
  candidates.sort((a, b) => {
    const timeA = a.timestamp || "";
    const timeB = b.timestamp || "";
    return timeA.localeCompare(timeB);
  });

  return candidates[candidates.length - 1];
}

export type CommandRunner = (
  file: string,
  args: string[],
  options?: { timeout?: number },
) => Promise<{ stdout: string; stderr: string }>;

/**
 * Resolves a human-readable application display name from a bundle identifier.
 * Uses Spotlight metadata (mdfind and mdls) which requires no elevated permissions.
 * Never guesses an application name from bundle ID suffixes.
 */
export async function resolveAppNameFromBundleId(
  bundleId: string,
  runner: CommandRunner = execFileAsync,
): Promise<{ displayName: string; appPath?: string } | null> {
  if (!isValidBundleId(bundleId)) {
    return null;
  }

  // Sanitize bundleId to prevent malformed query expression syntax
  const sanitizedBundleId = bundleId.replace(/[^a-zA-Z0-9.-]/g, "");
  if (!isValidBundleId(sanitizedBundleId)) {
    return null;
  }

  try {
    const { stdout: findOutput } = await runner("mdfind", [`kMDItemCFBundleIdentifier == "${sanitizedBundleId}"`], {
      timeout: 1000,
    });

    const candidatePaths = findOutput
      .split("\n")
      .map((p) => p.trim())
      .filter((p) => p.endsWith(".app"));

    if (candidatePaths.length > 0) {
      const firstPath = candidatePaths[0];
      try {
        const { stdout: nameOutput } = await runner("mdls", ["-name", "kMDItemDisplayName", "-raw", firstPath], {
          timeout: 1000,
        });

        const rawDisplayName = nameOutput.trim();
        if (rawDisplayName && rawDisplayName !== "(null)") {
          // Remove .app suffix if present in display name
          const cleanName = rawDisplayName.endsWith(".app") ? rawDisplayName.slice(0, -4) : rawDisplayName;
          return { displayName: cleanName, appPath: firstPath };
        }
      } catch {
        // Fallback to path basename if mdls fails
      }

      const basename = path.basename(firstPath, ".app");
      if (basename && basename !== "(null)") {
        return { displayName: basename, appPath: firstPath };
      }
    }
  } catch {
    // Spotlight failure
  }

  // Do not guess display names from bundle ID suffixes
  return null;
}

export interface DetectionOptions {
  timeoutMs?: number;
  lookbackWindow?: string;
  runner?: CommandRunner;
}

/**
 * Attempts to detect the most recent application blocked by macOS Gatekeeper.
 * Employs a strict timeout to ensure the user interaction is never blocked or delayed.
 * Returns null if no app is detected, if timed out, or if reliable display name identification fails.
 */
export async function detectRecentBlockedApp(options: DetectionOptions = {}): Promise<DetectedAppInfo | null> {
  const timeoutMs = options.timeoutMs ?? DETECTION_TIMEOUT_MS;
  const lookback = options.lookbackWindow ?? LOG_LOOKBACK_WINDOW;
  const runner = options.runner ?? execFileAsync;

  const predicate = 'process == "syspolicyd" and eventMessage contains "Gatekeeper denial breadcrumb"';

  try {
    const { stdout } = await runner("log", ["show", "--last", lookback, "--predicate", predicate, "--style", "json"], {
      timeout: timeoutMs,
    });

    if (!stdout || !stdout.trim()) {
      return null;
    }

    const events: UnifiedLogEvent[] = JSON.parse(stdout);
    const candidate = parseGatekeeperEvents(events);

    if (!candidate || !candidate.bundleId || !isValidBundleId(candidate.bundleId)) {
      return null;
    }

    const resolved = await resolveAppNameFromBundleId(candidate.bundleId, runner);
    if (!resolved || !resolved.displayName) {
      // Do not guess or pass unverified bundle ID as target name
      return null;
    }

    return {
      name: resolved.displayName,
      bundleId: candidate.bundleId,
      appPath: resolved.appPath,
      timestamp: candidate.timestamp,
    };
  } catch {
    // Fail silently without guessing; returning null triggers safe manual navigation
    return null;
  }
}
