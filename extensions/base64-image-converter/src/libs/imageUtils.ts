import { Buffer } from "buffer";

/**
 * Extracts the width and height of an image from its base64 representation.
 * @param base64 The base64 string of the image.
 * @returns An object containing the width and height of the image, or null if extraction fails.
 */
export function getImageDimensionsFromBase64(base64: string): { width: number; height: number } | null {
  try {
    // Remove the data URL prefix if present
    const cleanedBase64 = base64.replace(/^data:image\/\w+;base64,/, "");

    // Decode the base64 string
    const buffer = Buffer.from(cleanedBase64, "base64");

    // Check for PNG signature
    if (buffer.toString("hex", 0, 8) === "89504e470d0a1a0a") {
      // PNG: Width is at bytes 16-19, height at 20-23
      const width = buffer.readUInt32BE(16);
      const height = buffer.readUInt32BE(20);
      return { width, height };
    }

    // Check for JPEG signature
    if (buffer[0] === 0xff && buffer[1] === 0xd8) {
      let offset = 2;
      while (offset < buffer.length) {
        // Check for Start of Frame markers
        if (buffer[offset] === 0xff && (buffer[offset + 1] === 0xc0 || buffer[offset + 1] === 0xc2)) {
          const height = buffer.readUInt16BE(offset + 5);
          const width = buffer.readUInt16BE(offset + 7);
          return { width, height };
        }
        offset += 2 + buffer.readUInt16BE(offset + 2);
      }
    }

    // Unsupported format or unable to extract dimensions
    return null;
  } catch (error) {
    console.error("Error extracting image dimensions:", error);
    return null;
  }
}

export function calculateBase64Size(base64String: string): number {
  const padding = base64String.endsWith("==") ? 2 : base64String.endsWith("=") ? 1 : 0;
  return (base64String.length * 3) / 4 - padding;
}

export function isValidBase64(str: string): boolean {
  if (!str) return false;
  const base64Regex = /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/;
  return base64Regex.test(str);
}
