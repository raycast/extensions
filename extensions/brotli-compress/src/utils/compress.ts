import zlib from "zlib";

/**
 * Compresses an object using Brotli compression and returns a base64 encoded string
 * @param data The object to compress
 * @returns Base64 encoded compressed string
 * @throws Error if compression fails
 */
export function compress(data: object): string {
  try {
    const jsonString = JSON.stringify(data);
    const compressed = zlib.brotliCompressSync(Buffer.from(jsonString));
    return compressed.toString("base64");
  } catch (error) {
    throw new Error(`Failed to compress object: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
}

/**
 * Compresses a text string using Brotli compression and returns a base64 encoded string
 * @param text The text to compress
 * @returns Base64 encoded compressed string
 * @throws Error if compression fails or text is empty
 */
export function compressText(text: string): string {
  if (!text || text.trim().length === 0) {
    throw new Error("Cannot compress empty text");
  }

  try {
    const compressed = zlib.brotliCompressSync(Buffer.from(text, "utf8"));
    return compressed.toString("base64");
  } catch (error) {
    throw new Error(`Failed to compress text: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
}
