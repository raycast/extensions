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
    const pathKey = pathMatch ? pathMatch[1].trim() : undefined;

    if (msg.includes("Adding Gatekeeper denial breadcrumb")) {
      // Extract bundle ID or id: e.g. "(bundle_id: com.example.app)"
      const bundleMatch = msg.match(/\(bundle_id:\s*([^)]+)\)/) || msg.match(/\(id:\s*([^)]+)\)/);
      const rawId = bundleMatch ? bundleMatch[1].trim() : undefined;
      const bundleId = rawId && rawId !== "(null)" ? rawId : undefined;

      const key = pathKey || bundleId || `unknown-${ev.timestamp || Math.random()}`;
      activeBreadcrumbs.set(key, {
        bundleId,
        pathKey,
        timestamp: ev.timestamp,
      });
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
 */
export async function resolveAppNameFromBundleId(
  bundleId: string,
  runner: CommandRunner = execFileAsync,
): Promise<{ displayName: string; appPath?: string } | null> {
  if (!bundleId || bundleId === "(null)") {
    return null;
  }

  // Sanitize bundleId to prevent malformed query expression syntax
  const sanitizedBundleId = bundleId.replace(/[^a-zA-Z0-9.-]/g, "");
  if (!sanitizedBundleId) {
    return null;
  }

  try {
    const { stdout: findOutput } = await runner("mdfind", [`kMDItemCFBundleIdentifier == "${sanitizedBundleId}"`], {
      timeout: 1000,
    });

    const firstPath = findOutput
      .split("\n")
      .map((p) => p.trim())
      .find((p) => p.endsWith(".app"));

    if (firstPath) {
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
      return { displayName: basename, appPath: firstPath };
    }
  } catch {
    // If Spotlight search fails, fallback below
  }

  // If no .app path was found via Spotlight, derive a clean name from the bundle ID
  const parts = bundleId.split(".").filter(Boolean);
  const fallbackName = parts.length > 0 ? parts[parts.length - 1] : bundleId;
  return { displayName: fallbackName };
}

export interface DetectionOptions {
  timeoutMs?: number;
  lookbackWindow?: string;
  runner?: CommandRunner;
}

/**
 * Attempts to detect the most recent application blocked by macOS Gatekeeper.
 * Employs a strict timeout to ensure the user interaction is never blocked or delayed.
 * Returns null if no app is detected, if timed out, or if an error occurs.
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

    if (!candidate || !candidate.bundleId) {
      return null;
    }

    const resolved = await resolveAppNameFromBundleId(candidate.bundleId, runner);
    if (!resolved) {
      return {
        name: candidate.bundleId,
        bundleId: candidate.bundleId,
        timestamp: candidate.timestamp,
      };
    }

    return {
      name: resolved.displayName,
      bundleId: candidate.bundleId,
      appPath: resolved.appPath,
      timestamp: candidate.timestamp,
    };
  } catch {
    // Fail silently without guessing; returning null triggers safe generic instructions
    return null;
  }
}
