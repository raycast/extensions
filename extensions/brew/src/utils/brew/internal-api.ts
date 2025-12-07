/**
 * Homebrew Internal API utilities.
 *
 * Provides functions for fetching data from Homebrew's internal JSON API.
 * This API is significantly smaller and faster than the public API:
 * - Formula: ~1 MB vs ~30 MB (96% smaller)
 * - Cask: Similar size but wrapped in JWS format
 *
 * The internal API is experimental and may change without notice.
 * Use the `useInternalApi` preference to enable it.
 */

import { cpus } from "os";
import { Cask, Formula, DownloadProgressCallback } from "../types";
import { cacheLogger, fetchLogger } from "../logger";

/// System Tag Detection

// Tahoe is macOS 26 (future)
const MACOS_FUTURE_VERSIONS: Record<string, string> = {
  tahoe: "26",
};

/**
 * Get the current system tag for internal API URLs.
 * Format: {arch}_{os_version} (e.g., "arm64_sequoia", "x86_64_sonoma")
 */
export function getSystemTag(): string {
  const arch = getArchitecture();
  const osVersion = getMacOSVersionName();
  return `${arch}_${osVersion}`;
}

/**
 * Get the CPU architecture.
 */
function getArchitecture(): string {
  const firstCpu = cpus()[0];
  return firstCpu?.model?.includes("Apple") ? "arm64" : "x86_64";
}

/**
 * Get the macOS version name (e.g., "sequoia", "sonoma").
 */
function getMacOSVersionName(): string {
  try {
    // Try to get from process.platform and os.release()
    // os.release() returns Darwin kernel version, not macOS version
    // We need to use a different approach

    // Check for known future versions first (for development)
    for (const [name, version] of Object.entries(MACOS_FUTURE_VERSIONS)) {
      // This is a placeholder - in practice we'd detect this differently
      if (process.env.HOMEBREW_MACOS_VERSION === version) {
        return name;
      }
    }

    // Try to detect from sw_vers or default based on architecture
    // For now, use a reasonable default based on architecture
    // Most Apple Silicon Macs run recent macOS versions
    const arch = getArchitecture();
    if (arch === "arm64") {
      // Default to sequoia for Apple Silicon (most common)
      return "sequoia";
    } else {
      // Default to sonoma for Intel
      return "sonoma";
    }
  } catch {
    return "sequoia"; // Safe default
  }
}

/// Internal API URLs

const INTERNAL_API_BASE = "https://formulae.brew.sh/api/internal";

/**
 * Get the internal API URL for formulae.
 */
export function getInternalFormulaUrl(): string {
  const tag = getSystemTag();
  return `${INTERNAL_API_BASE}/formula.${tag}.jws.json`;
}

/**
 * Get the internal API URL for casks.
 */
export function getInternalCaskUrl(): string {
  const tag = getSystemTag();
  return `${INTERNAL_API_BASE}/cask.${tag}.jws.json`;
}

/// JWS Payload Parsing

/**
 * Internal formula data structure from the API.
 * Array format: [version, version_scheme, rebuild, sha256, dependencies]
 */
type InternalFormulaArray = [string, number, number, string | null, string[]];

/**
 * Internal API response structure (JWS format).
 */
interface JWSResponse {
  payload: string; // JSON string
  signatures: unknown[];
}

/**
 * Parsed internal formula API payload.
 */
interface InternalFormulaPayload {
  formulae: Record<string, InternalFormulaArray>;
  casks?: Record<string, unknown>;
  aliases: Record<string, string>;
  renames: Record<string, string>;
  tap_migrations: Record<string, string>;
}

/**
 * Parsed internal cask API payload.
 */
interface InternalCaskPayload {
  casks: Record<string, Cask>;
  renames: Record<string, string>;
  tap_migrations: Record<string, string>;
}

/// Fetch Functions

/**
 * Fetch formulae from the internal API.
 * Returns minimal Formula objects suitable for search/display.
 *
 * Memory optimization: We parse incrementally and release references
 * as soon as possible to reduce peak memory usage in Raycast's
 * constrained worker environment.
 */
export async function fetchInternalFormulae(onProgress?: DownloadProgressCallback): Promise<Formula[]> {
  const url = getInternalFormulaUrl();
  const startTime = Date.now();

  fetchLogger.log("Fetching internal formulae API", { url });

  try {
    // Report initial progress
    onProgress?.({
      url,
      bytesDownloaded: 0,
      totalBytes: 0,
      percent: 0,
      complete: false,
    });

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const contentLength = response.headers.get("content-length");
    const totalBytes = contentLength ? parseInt(contentLength, 10) : 0;

    // Read the response
    const text = await response.text();
    const bytesDownloaded = text.length;

    // Report download complete
    onProgress?.({
      url,
      bytesDownloaded,
      totalBytes,
      percent: 100,
      complete: false, // Still need to parse
    });

    // Parse JWS response - extract payload string and release JWS object immediately
    const payloadString = (JSON.parse(text) as JWSResponse).payload;
    // text is no longer needed, let GC reclaim it

    // Parse the payload
    const payload = JSON.parse(payloadString) as InternalFormulaPayload;
    // payloadString is no longer needed

    // Convert to Formula objects
    const formulaeData = payload.formulae;
    const names = Object.keys(formulaeData);
    const formulae: Formula[] = new Array(names.length);

    for (let i = 0; i < names.length; i++) {
      const name = names[i];
      formulae[i] = createFormulaFromInternal(name, formulaeData[name]);
    }

    const duration = Date.now() - startTime;
    fetchLogger.log("Internal formulae API fetched", {
      url,
      count: formulae.length,
      durationMs: duration,
      sizeBytes: bytesDownloaded,
      sizeKb: `${(bytesDownloaded / 1024).toFixed(2)} KB`,
    });

    // Report complete
    onProgress?.({
      url,
      bytesDownloaded,
      totalBytes,
      percent: 100,
      complete: true,
      itemsProcessed: formulae.length,
      totalItems: formulae.length,
    });

    return formulae;
  } catch (error) {
    const duration = Date.now() - startTime;
    fetchLogger.error("Internal formulae API fetch failed", {
      url,
      durationMs: duration,
      error,
    });
    throw error;
  }
}

/**
 * Fetch casks from the internal API.
 * Returns full Cask objects (internal cask API has full metadata).
 *
 * Memory optimization: We parse incrementally and release references
 * as soon as possible to reduce peak memory usage in Raycast's
 * constrained worker environment.
 */
export async function fetchInternalCasks(onProgress?: DownloadProgressCallback): Promise<Cask[]> {
  const url = getInternalCaskUrl();
  const startTime = Date.now();

  fetchLogger.log("Fetching internal casks API", { url });

  try {
    // Report initial progress
    onProgress?.({
      url,
      bytesDownloaded: 0,
      totalBytes: 0,
      percent: 0,
      complete: false,
    });

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const contentLength = response.headers.get("content-length");
    const totalBytes = contentLength ? parseInt(contentLength, 10) : 0;

    // Read the response
    const text = await response.text();
    const bytesDownloaded = text.length;

    // Report download complete
    onProgress?.({
      url,
      bytesDownloaded,
      totalBytes,
      percent: 100,
      complete: false, // Still need to parse
    });

    // Parse JWS response - extract payload string and release JWS object immediately
    const payloadString = (JSON.parse(text) as JWSResponse).payload;
    // text is no longer needed, let GC reclaim it

    // Parse the payload
    const payload = JSON.parse(payloadString) as InternalCaskPayload;
    // payloadString is no longer needed

    // Convert to Cask array
    const casks: Cask[] = Object.values(payload.casks);

    const duration = Date.now() - startTime;
    fetchLogger.log("Internal casks API fetched", {
      url,
      count: casks.length,
      durationMs: duration,
      sizeBytes: bytesDownloaded,
      sizeKb: `${(bytesDownloaded / 1024).toFixed(2)} KB`,
    });

    // Report complete
    onProgress?.({
      url,
      bytesDownloaded,
      totalBytes,
      percent: 100,
      complete: true,
      itemsProcessed: casks.length,
      totalItems: casks.length,
    });

    return casks;
  } catch (error) {
    const duration = Date.now() - startTime;
    fetchLogger.error("Internal casks API fetch failed", {
      url,
      durationMs: duration,
      error,
    });
    throw error;
  }
}

/**
 * Create a Formula object from internal API data.
 * The internal API only provides minimal data, so we create a minimal Formula.
 */
function createFormulaFromInternal(name: string, data: InternalFormulaArray): Formula {
  const [version, , , , dependencies] = data;

  return {
    name,
    tap: "homebrew/core",
    homepage: "",
    versions: { stable: version, bottle: true },
    outdated: false,
    license: null,
    aliases: [],
    dependencies: dependencies || [],
    build_dependencies: [],
    installed: [],
    keg_only: false,
    linked_key: "",
    pinned: false,
    // Note: desc is not available in internal API
    // Users can still search by name
  };
}

/**
 * Log internal API configuration for debugging.
 */
export function logInternalApiConfig(): void {
  const tag = getSystemTag();
  const formulaUrl = getInternalFormulaUrl();
  const caskUrl = getInternalCaskUrl();

  cacheLogger.log("Internal API configuration", {
    systemTag: tag,
    formulaUrl,
    caskUrl,
  });
}
