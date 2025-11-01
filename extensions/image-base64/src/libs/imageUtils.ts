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

    // Check for WebP signature
    if (buffer.toString("ascii", 0, 4) === "RIFF" && buffer.toString("ascii", 8, 12) === "WEBP") {
      // WebP: Width and height are stored in VP8/VP8L chunk
      const vp8Signature = buffer.toString("ascii", 12, 15);
      if (vp8Signature === "VP8") {
        // Simple WebP format
        const width = buffer.readUInt16LE(26) & 0x3fff;
        const height = buffer.readUInt16LE(28) & 0x3fff;
        return { width, height };
      } else if (vp8Signature === "VP8L") {
        // Lossless WebP format
        const bits = buffer.readUInt32LE(21);
        const width = (bits & 0x3fff) + 1;
        const height = ((bits >> 14) & 0x3fff) + 1;
        return { width, height };
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
  try {
    if (!str) return false;

    let base64Data = str;
    if (str.startsWith("data:image/")) {
      const parts = str.split(",");
      if (parts.length !== 2) return false;
      base64Data = parts[1];
    }

    if (base64Data.length % 4 !== 0) return false;
    if (!/^[A-Za-z0-9+/=]*$/.test(base64Data)) return false;

    const lastPadding = base64Data.indexOf("=");
    if (lastPadding !== -1) {
      if (lastPadding !== base64Data.length - 1 && lastPadding !== base64Data.length - 2) return false;
      if (base64Data.indexOf("=") !== lastPadding) return false;
    }

    return true;
  } catch {
    return false;
  }
}

export function formatFileSize(bytes: number): string {
  const MB = 1024 * 1024;
  const KB = 1024;

  if (bytes > MB) {
    return `${(bytes / MB).toFixed(2)} MB`;
  }
  return `${(bytes / KB).toFixed(2)} KB`;
}
