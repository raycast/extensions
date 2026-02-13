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
import * as fs from "fs";
import { chain } from "stream-chain";
import { parser } from "stream-json";
import { pick } from "stream-json/filters/Pick";
import { streamObject } from "stream-json/streamers/StreamObject";
import { Formula, DownloadProgressCallback } from "../types";
import { cacheLogger, fetchLogger } from "../logger";
import { logMemory, withMemoryTracking } from "../memory";

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
 *
 * Note: Currently not used - casks use the public API for better memory efficiency.
 * The internal cask API (~13 MB) requires JWS parsing overhead that negates the
 * download size benefit compared to stream-json parsing the public API (~30 MB).
 * Kept for potential future use if a more efficient JWS parser is implemented.
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

/// Streaming Cache Functions

/**
 * Download internal API and write to standard cache format.
 *
 * This hybrid approach:
 * 1. Downloads the smaller internal API (~1 MB formulae vs ~30 MB)
 * 2. Extracts the JWS payload
 * 3. Converts to array format and writes to standard cache files
 * 4. Allows existing stream-json parsing to be used for reading
 *
 * Memory optimization: We stream the download to disk, then process
 * the JWS payload incrementally to avoid holding large data in memory.
 */

/**
 * Download internal formulae API and write to cache in standard array format.
 * Uses streaming to avoid loading the entire payload into memory.
 *
 * @param cachePath - Path to write the converted cache file
 * @param onProgress - Optional callback for progress updates
 */
export async function downloadAndCacheInternalFormulae(
  cachePath: string,
  onProgress?: DownloadProgressCallback,
): Promise<void> {
  const url = getInternalFormulaUrl();
  const startTime = Date.now();
  const tempJwsPath = cachePath + ".jws.tmp";

  fetchLogger.log("Downloading internal formulae API for cache", { url, cachePath });

  await withMemoryTracking(
    "downloadAndCacheInternalFormulae",
    async () => {
      // Report initial progress
      onProgress?.({
        url,
        bytesDownloaded: 0,
        totalBytes: 0,
        percent: 0,
        complete: false,
        phase: "downloading",
      });

      const response = await fetch(url);
      if (!response.ok || !response.body) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const contentLength = response.headers.get("content-length");
      const totalBytes = contentLength ? parseInt(contentLength, 10) : 0;

      // Step 1: Stream download directly to temp file (no memory accumulation)
      let bytesDownloaded = 0;
      let lastProgressUpdate = 0;
      const PROGRESS_THROTTLE_MS = 100;

      const downloadStream = fs.createWriteStream(tempJwsPath);
      const reader = response.body.getReader();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        downloadStream.write(Buffer.from(value));
        bytesDownloaded += value.length;

        const now = Date.now();
        if (now - lastProgressUpdate >= PROGRESS_THROTTLE_MS) {
          lastProgressUpdate = now;
          const percent = totalBytes > 0 ? Math.round((bytesDownloaded / totalBytes) * 100) : -1;
          onProgress?.({
            url,
            bytesDownloaded,
            totalBytes,
            percent,
            complete: false,
            phase: "downloading",
          });
        }
      }

      await new Promise<void>((resolve, reject) => {
        downloadStream.end((err: Error | null) => {
          if (err) reject(err);
          else resolve();
        });
      });

      logMemory("After formulae download to disk");

      onProgress?.({
        url,
        bytesDownloaded,
        totalBytes,
        percent: 100,
        complete: false,
        phase: "processing",
      });

      // Step 2: Extract the payload from JWS directly to a temp file (no memory accumulation)
      const tempPayloadPath = cachePath + ".payload.tmp";
      await extractJwsPayloadToFile(tempJwsPath, tempPayloadPath);
      logMemory("After JWS payload extraction to disk");

      // Step 4: Stream-parse the formulae and write to cache
      // Formulae are in format: {"formulae": {"name": [version, scheme, rebuild, sha256, deps], ...}}
      let itemsProcessed = 0;
      const writeStream = fs.createWriteStream(cachePath);
      writeStream.write("[");

      await new Promise<void>((resolve, reject) => {
        const pipeline = chain([
          fs.createReadStream(tempPayloadPath),
          parser(),
          pick({ filter: "formulae" }),
          streamObject(),
        ]);

        let isFirst = true;

        pipeline.on("data", (data: { key: string; value: InternalFormulaArray }) => {
          if (data && data.key && data.value) {
            const formula = createFormulaFromInternal(data.key, data.value);

            if (!isFirst) {
              writeStream.write(",\n");
            } else {
              writeStream.write("\n");
              isFirst = false;
            }
            writeStream.write(JSON.stringify(formula));
            itemsProcessed++;

            // Report progress (throttled)
            const now = Date.now();
            if (now - lastProgressUpdate >= PROGRESS_THROTTLE_MS) {
              lastProgressUpdate = now;
              onProgress?.({
                url,
                bytesDownloaded,
                totalBytes,
                percent: 100,
                complete: false,
                phase: "processing",
                itemsProcessed,
              });
            }
          }
        });

        pipeline.on("end", () => {
          writeStream.write("\n]");
          writeStream.end((err: Error | null) => {
            if (err) reject(err);
            else resolve();
          });
        });

        pipeline.on("error", reject);
      });

      // Clean up temp files
      try {
        fs.unlinkSync(tempJwsPath);
        fs.unlinkSync(tempPayloadPath);
      } catch {
        // Ignore cleanup errors
      }

      logMemory("After formulae cache write (streaming)");

      const duration = Date.now() - startTime;
      fetchLogger.log("Internal formulae cached", {
        url,
        cachePath,
        count: itemsProcessed,
        durationMs: duration,
        downloadBytes: bytesDownloaded,
      });

      onProgress?.({
        url,
        bytesDownloaded,
        totalBytes,
        percent: 100,
        complete: true,
        phase: "processing",
        itemsProcessed,
        totalItems: itemsProcessed,
      });
    },
    { logAlways: true },
  );
}

/**
 * Extract the payload from a JWS file and write it directly to another file.
 * This avoids loading the entire payload string into memory.
 *
 * The JWS format is: {"payload": "...escaped JSON string...", ...}
 * We stream through the file, find the payload value, unescape it, and write to output.
 *
 * Memory optimization: Use array-based buffering to avoid string concatenation overhead.
 */
async function extractJwsPayloadToFile(jwsFilePath: string, outputPath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const readStream = fs.createReadStream(jwsFilePath, { encoding: "utf8", highWaterMark: 16 * 1024 });
    const writeStream = fs.createWriteStream(outputPath, { highWaterMark: 16 * 1024 });

    let state: "searching" | "in_payload" | "done" = "searching";
    let searchBuffer = "";
    let unicodeBuffer = "";
    let escapeNext = false;

    // Use array-based buffering to avoid string concatenation memory overhead
    const outputChunks: string[] = [];
    let outputSize = 0;
    const FLUSH_THRESHOLD = 8 * 1024; // Flush every 8KB

    const flushOutput = () => {
      if (outputChunks.length > 0) {
        writeStream.write(outputChunks.join(""));
        outputChunks.length = 0;
        outputSize = 0;
      }
    };

    const appendOutput = (str: string) => {
      outputChunks.push(str);
      outputSize += str.length;
      if (outputSize >= FLUSH_THRESHOLD) {
        flushOutput();
      }
    };

    // We're looking for: "payload":" then capturing until the closing unescaped "
    const payloadMarker = '"payload":"';

    readStream.on("data", (chunkData: string | Buffer) => {
      const chunk = typeof chunkData === "string" ? chunkData : chunkData.toString("utf8");
      if (state === "done") return;

      // Process chunk - collect runs of regular characters to batch
      let runStart = -1;

      for (let i = 0; i < chunk.length; i++) {
        const char = chunk[i];

        if (state === "searching") {
          searchBuffer += char;
          // Keep buffer small - only need enough to match the marker
          if (searchBuffer.length > payloadMarker.length) {
            searchBuffer = searchBuffer.slice(-payloadMarker.length);
          }
          if (searchBuffer === payloadMarker) {
            state = "in_payload";
            searchBuffer = "";
          }
        } else if (state === "in_payload") {
          if (escapeNext) {
            // Handle escape sequences
            escapeNext = false;
            if (char === "n") {
              appendOutput("\n");
            } else if (char === "r") {
              appendOutput("\r");
            } else if (char === "t") {
              appendOutput("\t");
            } else if (char === '"') {
              appendOutput('"');
            } else if (char === "\\") {
              appendOutput("\\");
            } else if (char === "/") {
              appendOutput("/");
            } else if (char === "u") {
              // Unicode escape - collect next 4 chars
              unicodeBuffer = "\\u";
            } else {
              // Unknown escape, write as-is
              appendOutput(char);
            }
          } else if (unicodeBuffer.length > 0) {
            unicodeBuffer += char;
            if (unicodeBuffer.length === 6) {
              // Complete unicode escape: \uXXXX
              try {
                const codePoint = parseInt(unicodeBuffer.slice(2), 16);
                appendOutput(String.fromCharCode(codePoint));
              } catch {
                appendOutput(unicodeBuffer);
              }
              unicodeBuffer = "";
            }
          } else if (char === "\\") {
            // Flush any pending run before escape
            if (runStart >= 0) {
              appendOutput(chunk.slice(runStart, i));
              runStart = -1;
            }
            escapeNext = true;
          } else if (char === '"') {
            // Flush any pending run
            if (runStart >= 0) {
              appendOutput(chunk.slice(runStart, i));
              runStart = -1;
            }
            // End of payload string
            state = "done";
            flushOutput();
            writeStream.end();
            resolve();
            return;
          } else {
            // Regular character - start or continue a run
            if (runStart < 0) {
              runStart = i;
            }
          }
        }
      }

      // Flush any remaining run from this chunk
      if (state === "in_payload" && runStart >= 0) {
        appendOutput(chunk.slice(runStart));
      }
    });

    readStream.on("end", () => {
      if (state !== "done") {
        flushOutput();
        writeStream.end();
        if (state === "searching") {
          reject(new Error("No payload found in JWS file"));
        } else {
          // Payload wasn't properly terminated, but we got data
          resolve();
        }
      }
    });

    readStream.on("error", (err) => {
      writeStream.end();
      reject(err);
    });

    writeStream.on("error", reject);
  });
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
