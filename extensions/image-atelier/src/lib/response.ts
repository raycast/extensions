// Limits apply to decompressed stream bytes, not only Content-Length.
export const MAX_IMAGE_BYTES = 50 * 1024 * 1024;
export const MAX_JSON_BYTES = Math.ceil(MAX_IMAGE_BYTES / 3) * 4 + 1024 * 1024;
export async function readBounded(
  response: Response,
  limit: number,
): Promise<Buffer> {
  const length = response.headers.get("content-length");
  if (length !== null && Number(length) > limit) {
    await response.body?.cancel();
    throw new Error(`Response exceeds the ${limit}-byte size limit.`);
  }
  if (!response.body) return Buffer.alloc(0);
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > limit) {
        await reader.cancel();
        throw new Error(`Response exceeds the ${limit}-byte size limit.`);
      }
      chunks.push(value);
    }
    return Buffer.concat(chunks, size);
  } finally {
    reader.releaseLock();
  }
}
export function decodeImage(value: string, limit = MAX_IMAGE_BYTES): Buffer {
  if (typeof value !== "string")
    throw new Error("Invalid base64 image response.");
  const normalizedValue = value.replace(/[ \t\r\n\f]/g, "");
  if (normalizedValue.length > Math.ceil(limit / 3) * 4)
    throw new Error("Image exceeds the size limit.");
  const bytes = Buffer.from(normalizedValue, "base64");
  if (bytes.length > limit) throw new Error("Image exceeds the size limit.");
  return bytes;
}
