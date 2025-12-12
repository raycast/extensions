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

import { cpus, release } from "os";
import { execSync } from "child_process";
import { Cask, Formula, DownloadProgressCallback } from "../types";
import { cacheLogger, fetchLogger } from "../logger";
import { logMemory } from "../memory";

/// System Tag Detection

/**
 * macOS version name mapping from major version number.
 * Darwin kernel version = macOS version + 4 (e.g., Darwin 24.x = macOS 15 Sequoia)
 * https://en.wikipedia.org/wiki/Darwin_(operating_system)#Release_history
 */
const MACOS_VERSION_NAMES: Record<number, string> = {
  15: "sequoia", // macOS 15 (Darwin 24.x)
  14: "sonoma", // macOS 14 (Darwin 23.x)
  13: "ventura", // macOS 13 (Darwin 22.x)
  12: "monterey", // macOS 12 (Darwin 21.x)
  11: "big_sur", // macOS 11 (Darwin 20.x)
  // Homebrew 5.0 dropped support for macOS 10.14 (Mojave) and earlier
};

// Future macOS versions (for development/testing)
const MACOS_FUTURE_VERSIONS: Record<string, number> = {
  tahoe: 26, // macOS 26 (future)
};

// Cache detected values to avoid repeated system calls
let cachedSystemTag: string | null = null;
let cachedMacOSVersion: number | null = null;

/**
 * Get the current system tag for internal API URLs.
 * Format: {arch}_{os_version} (e.g., "arm64_sequoia", "x86_64_sonoma")
 */
export function getSystemTag(): string {
  if (cachedSystemTag) {
    return cachedSystemTag;
  }

  const arch = getArchitecture();
  const osVersion = getMacOSVersionName();
  cachedSystemTag = `${arch}_${osVersion}`;

  fetchLogger.log("Detected system tag", {
    systemTag: cachedSystemTag,
    architecture: arch,
    macOSVersion: osVersion,
  });

  return cachedSystemTag;
}

/**
 * Get the CPU architecture.
 * Uses process.arch as primary source, with CPU model as fallback.
 *
 * Handles:
 * - process.arch: "arm64" → "arm64", "x64" → "x86_64"
 * - CPU model detection: Fallback for edge cases (Apple Silicon, Intel detection)
 * - Error handling: Safe defaults if detection fails (returns "x86_64")
 */
function getArchitecture(): string {
  // Method 1: Use process.arch (most reliable)
  // Node.js process.arch values: https://nodejs.org/api/process.html#process_process_arch
  if (process.arch === "arm64") {
    return "arm64";
  }
  if (process.arch === "x64") {
    return "x86_64";
  }
  // Other architectures (ppc64, s390x, etc.) - not supported by Homebrew on macOS
  // Treat unknown architectures as x86_64 (safe default)

  // Method 2: Fallback to CPU model detection
  // This handles edge cases where process.arch might be unreliable
  try {
    const cpuList = cpus();
    if (!cpuList || cpuList.length === 0) {
      // No CPUs detected, use safe default
      fetchLogger.warn("No CPUs detected, defaulting to x86_64");
      return "x86_64";
    }

    const firstCpu = cpuList[0];
    if (!firstCpu || typeof firstCpu.model !== "string") {
      // CPU model is not a string, use safe default
      fetchLogger.warn("CPU model is not a string, defaulting to x86_64", {
        cpuModel: typeof firstCpu?.model,
      });
      return "x86_64";
    }

    // Check for Apple Silicon markers
    if (firstCpu.model.includes("Apple")) {
      return "arm64";
    }

    // Check for Intel markers
    if (firstCpu.model.includes("Intel")) {
      return "x86_64";
    }

    // Unknown CPU model, use safe default
    fetchLogger.warn("Unknown CPU model, defaulting to x86_64", {
      cpuModel: firstCpu.model,
    });
    return "x86_64";
  } catch (error) {
    // CPU detection failed entirely, use safe default
    fetchLogger.warn("CPU detection failed, defaulting to x86_64", {
      error: error instanceof Error ? error.message : String(error),
    });
    return "x86_64";
  }
}

/**
 * Get the macOS major version number.
 * Uses multiple detection methods for reliability.
 */
function getMacOSVersion(): number {
  if (cachedMacOSVersion !== null) {
    return cachedMacOSVersion;
  }

  // Method 1: Check environment variable override (for testing/development)
  const envVersion = process.env.HOMEBREW_MACOS_VERSION;
  if (envVersion) {
    const parsed = parseInt(envVersion, 10);
    if (!isNaN(parsed) && parsed >= 11 && parsed <= 30) {
      cachedMacOSVersion = parsed;
      return cachedMacOSVersion;
    }
  }

  // Method 2: Try sw_vers command (most accurate)
  try {
    const swVersOutput = execSync("sw_vers -productVersion", {
      encoding: "utf8",
      timeout: 5000,
      stdio: ["pipe", "pipe", "pipe"],
    }).trim();
    // Format: "15.1" or "14.6.1"
    const majorVersion = parseInt(swVersOutput.split(".")[0], 10);
    if (!isNaN(majorVersion) && majorVersion >= 11) {
      cachedMacOSVersion = majorVersion;
      return cachedMacOSVersion;
    }
  } catch {
    // sw_vers failed, try next method
  }

  // Method 3: Derive from Darwin kernel version
  // Darwin version = macOS version + 4 (approximately)
  // e.g., Darwin 24.x = macOS 15 (Sequoia)
  try {
    const darwinVersion = release(); // e.g., "24.1.0"
    const darwinMajor = parseInt(darwinVersion.split(".")[0], 10);
    if (!isNaN(darwinMajor) && darwinMajor >= 20) {
      // Darwin 20 = macOS 11, Darwin 21 = macOS 12, etc.
      cachedMacOSVersion = darwinMajor - 9;
      return cachedMacOSVersion;
    }
  } catch {
    // Darwin version detection failed
  }

  // Method 4: Default based on architecture (last resort)
  // Apple Silicon requires macOS 11+, most users are on recent versions
  const arch = getArchitecture();
  cachedMacOSVersion = arch === "arm64" ? 15 : 14; // Sequoia for ARM, Sonoma for Intel
  return cachedMacOSVersion;
}

/**
 * Get the macOS version name (e.g., "sequoia", "sonoma").
 */
function getMacOSVersionName(): string {
  const version = getMacOSVersion();

  // Check known versions
  const versionName = MACOS_VERSION_NAMES[version];
  if (versionName) {
    return versionName;
  }

  // Check future versions
  for (const [name, futureVersion] of Object.entries(MACOS_FUTURE_VERSIONS)) {
    if (version === futureVersion) {
      return name;
    }
  }

  // Unknown version - use the most recent known version
  // This handles cases where a new macOS is released before we update the map
  if (version > 15) {
    fetchLogger.warn("Unknown macOS version, using sequoia as fallback", {
      detectedVersion: version,
    });
    return "sequoia";
  }

  // Very old version (shouldn't happen with Homebrew 5.0)
  fetchLogger.warn("Unsupported macOS version detected", {
    detectedVersion: version,
    minimumSupported: 11,
  });
  return "big_sur";
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
 * JWS (JSON Web Signature) wraps the payload with cryptographic signatures.
 *
 * Note: We do not verify signatures as this is read-only public data.
 * The signatures are primarily for Homebrew's internal integrity checks.
 */
interface JWSResponse {
  payload: string; // Base64url-encoded or plain JSON string
  signatures?: unknown[]; // Optional array of signatures
  protected?: string; // Optional protected header
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

/**
 * Type guard to validate JWS response structure.
 */
function isValidJWSResponse(obj: unknown): obj is JWSResponse {
  if (typeof obj !== "object" || obj === null) {
    return false;
  }
  const response = obj as Record<string, unknown>;
  return typeof response.payload === "string" && response.payload.length > 0;
}

/**
 * Parse and validate a JWS response, extracting the payload.
 * Handles both plain JSON payloads and base64url-encoded payloads.
 *
 * @throws Error if the response is not a valid JWS structure
 */
function parseJWSPayload<T>(text: string, context: string): T {
  let jwsResponse: unknown;

  // Step 1: Parse outer JSON
  try {
    jwsResponse = JSON.parse(text);
  } catch (error) {
    fetchLogger.warn(`Failed to parse ${context} JWS response as JSON`, {
      context,
      error: error instanceof Error ? error.message : String(error),
    });
    throw new Error(`Failed to parse ${context} JWS response: Invalid JSON`);
  }

  // Step 2: Validate JWS structure
  if (!isValidJWSResponse(jwsResponse)) {
    throw new Error(
      `Invalid ${context} JWS response: Missing or invalid 'payload' field. ` +
        `Expected object with 'payload' string, got: ${typeof jwsResponse}`,
    );
  }

  // Step 3: Extract and parse payload
  const payloadString = jwsResponse.payload;
  let payload: T;

  try {
    // Try parsing as plain JSON first (Homebrew's format)
    payload = JSON.parse(payloadString) as T;
  } catch (plainJsonError) {
    // If that fails, try base64url decoding (standard JWS format)
    try {
      const decoded = Buffer.from(payloadString, "base64url").toString("utf8");
      payload = JSON.parse(decoded) as T;
    } catch (decodeError) {
      fetchLogger.warn(`Failed to parse ${context} JWS payload with both plain JSON and base64url decoding`, {
        context,
        plainJsonError: plainJsonError instanceof Error ? plainJsonError.message : String(plainJsonError),
        decodeError: decodeError instanceof Error ? decodeError.message : String(decodeError),
      });
      throw new Error(
        `Failed to parse ${context} JWS payload: ` + `Neither plain JSON nor base64url decoding succeeded`,
      );
    }
  }

  return payload;
}

/**
 * Validate internal formula payload structure.
 */
function isValidFormulaPayload(obj: unknown): obj is InternalFormulaPayload {
  if (typeof obj !== "object" || obj === null) {
    return false;
  }
  const payload = obj as Record<string, unknown>;
  return (
    typeof payload.formulae === "object" &&
    payload.formulae !== null &&
    typeof payload.aliases === "object" &&
    typeof payload.renames === "object"
  );
}

/**
 * Validate internal cask payload structure.
 */
function isValidCaskPayload(obj: unknown): obj is InternalCaskPayload {
  if (typeof obj !== "object" || obj === null) {
    return false;
  }
  const payload = obj as Record<string, unknown>;
  return typeof payload.casks === "object" && payload.casks !== null;
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
  logMemory("Before fetchInternalFormulae");

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
    logMemory("After formulae download");

    // Report download complete
    onProgress?.({
      url,
      bytesDownloaded,
      totalBytes,
      percent: 100,
      complete: false, // Still need to parse
    });

    // Parse and validate JWS response
    const payload = parseJWSPayload<InternalFormulaPayload>(text, "formulae");
    // text is no longer needed, let GC reclaim it
    logMemory("After formulae JWS parse");

    // Validate payload structure
    if (!isValidFormulaPayload(payload)) {
      throw new Error("Invalid formulae payload structure: missing required fields (formulae, aliases, renames)");
    }

    // Convert to Formula objects
    const formulaeData = payload.formulae;
    const names = Object.keys(formulaeData);
    const formulae: Formula[] = new Array(names.length);

    for (let i = 0; i < names.length; i++) {
      const name = names[i];
      formulae[i] = createFormulaFromInternal(name, formulaeData[name]);
    }

    logMemory("After formulae conversion");

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
    logMemory("Error in fetchInternalFormulae", true);
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
  logMemory("Before fetchInternalCasks");

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
    logMemory("After casks download");

    // Report download complete
    onProgress?.({
      url,
      bytesDownloaded,
      totalBytes,
      percent: 100,
      complete: false, // Still need to parse
    });

    // Parse and validate JWS response
    const payload = parseJWSPayload<InternalCaskPayload>(text, "casks");
    // text is no longer needed, let GC reclaim it
    logMemory("After casks JWS parse");

    // Validate payload structure
    if (!isValidCaskPayload(payload)) {
      throw new Error("Invalid casks payload structure: missing required 'casks' field");
    }

    // Convert to Cask array
    const casks: Cask[] = Object.values(payload.casks);
    logMemory("After casks conversion");

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
    logMemory("Error in fetchInternalCasks", true);
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
