import { Icon, Image } from "@raycast/api";

/**
 * Get favicon URL for a website using Google's favicon service
 */
export function getFavicon(url: string, size: number = 64): Image.ImageLike {
  try {
    const hostname = new URL(url).hostname;
    return {
      source: `https://www.google.com/s2/favicons?domain=${hostname}&sz=${size}`,
      fallback: Icon.Globe,
    };
  } catch {
    return Icon.Globe;
  }
}
