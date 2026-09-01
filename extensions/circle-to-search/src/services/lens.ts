import { open } from "@raycast/api";

/**
 * Builds the Google Lens visual search URL for a given public image URL.
 */
export function buildGoogleLensUrl(imageUrl: string): string {
  return `https://lens.google.com/uploadbyurl?url=${encodeURIComponent(imageUrl)}`;
}

/**
 * Opens Google Lens search results for the given image in the user's default browser.
 */
export async function openGoogleLens(imageUrl: string): Promise<void> {
  const lensUrl = buildGoogleLensUrl(imageUrl);
  await open(lensUrl);
}
