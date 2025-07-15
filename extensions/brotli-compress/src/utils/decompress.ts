import zlib from "zlib";

/**
 * Validates if a string is valid base64
 * @param str The string to validate
 * @returns true if valid base64, false otherwise
 */
function isValidBase64(str: string): boolean {
  try {
    // Check if string matches base64 pattern
    const base64Regex = /^[A-Za-z0-9+/]*={0,2}$/;
    return base64Regex.test(str) && Buffer.from(str, "base64").toString("base64") === str;
  } catch {
    return false;
  }
}

/**
 * Decompresses a base64 encoded Brotli compressed string and parses it as JSON
 * @param data Base64 encoded compressed string
 * @returns Parsed JSON object
 * @throws Error if decompression fails or data is invalid
 */
export function decompress(data: string): unknown {
  if (!data || data.trim().length === 0) {
    throw new Error("Cannot decompress empty data");
  }

  if (!isValidBase64(data.trim())) {
    throw new Error("Invalid base64 encoded data");
  }

  try {
    const buffer = Buffer.from(data.trim(), "base64");
    const decompressed = zlib.brotliDecompressSync(buffer);
    const text = decompressed.toString("utf8");
    return JSON.parse(text);
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new Error("Decompressed data is not valid JSON");
    }
    throw new Error(`Failed to decompress data: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
}

/**
 * Decompresses a base64 encoded Brotli compressed string and returns it as a string
 * @param data Base64 encoded compressed string
 * @returns Decompressed string
 * @throws Error if decompression fails or data is invalid
 */
export function decompressAsString(data: string): string {
  if (!data || data.trim().length === 0) {
    throw new Error("Cannot decompress empty data");
  }

  if (!isValidBase64(data.trim())) {
    throw new Error("Invalid base64 encoded data");
  }

  try {
    const buffer = Buffer.from(data.trim(), "base64");
    const decompressed = zlib.brotliDecompressSync(buffer);
    return decompressed.toString("utf8");
  } catch (error) {
    throw new Error(`Failed to decompress data: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
}
