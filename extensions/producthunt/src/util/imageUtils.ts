// Simple in-memory cache to avoid re-fetching the same images
const imageCache: Record<string, string> = {};

/**
 * Fetches an SVG image and converts it to a base64 data URL
 * Falls back to the original URL if fetching fails
 *
 * @param url The URL of the SVG image to fetch
 * @returns A Promise that resolves to either a base64 data URL or the original URL
 */
export async function fetchSvgAsBase64(url: string): Promise<string> {
  // Return from cache if available
  if (imageCache[url]) {
    return imageCache[url];
  }

  try {
    // Only process SVG images
    if (!url.includes(".svg")) {
      return url;
    }

    const response = await fetch(url);

    if (!response.ok) {
      try {
        const { getLogger } = await import("./logger");
        const log = getLogger("imageUtils");
        log.error("image:fetch_failed", new Error(`HTTP ${response.status}`), {
          status: response.status,
          statusText: response.statusText,
          url,
        });
      } catch {
        // ignore
      }
      return url;
    }

    // Check if the content is actually an SVG
    const contentType = response.headers.get("content-type");
    if (!contentType || !contentType.includes("svg")) {
      return url;
    }

    // Read the response as an array buffer
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Convert the buffer to a Base64 string
    const base64Image = buffer.toString("base64");

    // Create a data URL
    const base64String = `data:${contentType};base64,${base64Image}`;

    // Cache the result
    imageCache[url] = base64String;

    return base64String;
  } catch (error) {
    console.error("Error fetching SVG image:", error);
    return url; // Fall back to the original URL
  }
}

/**
 * Processes a thumbnail URL - converts SVGs to base64 data URLs
 *
 * @param url The image URL to process
 * @returns A Promise that resolves to the processed URL
 */
export async function processThumbnail(url: string | undefined): Promise<string | undefined> {
  if (!url) return undefined;

  // If it's an SVG, convert to base64
  if (url.includes(".svg")) {
    return await fetchSvgAsBase64(url);
  }

  // Return the original URL for non-SVG images
  return url;
}
