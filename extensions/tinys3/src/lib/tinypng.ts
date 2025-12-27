export type TinyPngResult = {
  output: Buffer;
  beforeBytes: number;
  afterBytes: number;
  compressionCount?: string | null;
};

/**
 * Generate Basic Auth header for TinyPNG API
 */
function authHeader(apiKey: string): string {
  const token = Buffer.from(`api:${apiKey}`, "utf8").toString("base64");
  return `Basic ${token}`;
}

/**
 * Compress image using TinyPNG API.
 *
 * Flow:
 * 1. POST to /shrink with image data
 * 2. Get Location header from response
 * 3. GET the Location URL to download compressed image
 */
export async function compressWithTinyPng(input: Buffer, apiKey: string): Promise<TinyPngResult> {
  // Step 1: Upload image to TinyPNG
  const shrinkResponse = await fetch("https://api.tinify.com/shrink", {
    method: "POST",
    headers: {
      Authorization: authHeader(apiKey),
    },
    body: input,
  });

  if (!shrinkResponse.ok) {
    const errorText = await shrinkResponse.text().catch(() => "");
    throw new Error(`TinyPNG compression failed (${shrinkResponse.status}): ${errorText}`);
  }

  // Step 2: Get location of compressed image
  const location = shrinkResponse.headers.get("Location");
  if (!location) {
    throw new Error("TinyPNG: Missing Location header in response.");
  }

  const compressionCount = shrinkResponse.headers.get("Compression-Count");

  // Step 3: Download compressed image
  const downloadResponse = await fetch(location, {
    method: "GET",
    headers: {
      Authorization: authHeader(apiKey),
    },
  });

  if (!downloadResponse.ok) {
    const errorText = await downloadResponse.text().catch(() => "");
    throw new Error(`TinyPNG download failed (${downloadResponse.status}): ${errorText}`);
  }

  const outputBuffer = Buffer.from(await downloadResponse.arrayBuffer());

  return {
    output: outputBuffer,
    beforeBytes: input.length,
    afterBytes: outputBuffer.length,
    compressionCount,
  };
}
