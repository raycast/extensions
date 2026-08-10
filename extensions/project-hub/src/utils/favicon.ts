import { Icon, Image } from "@raycast/api";

// Get the base URL from a full URL
function getBaseUrl(url: string): string {
  try {
    const urlObj = new URL(url);
    return `${urlObj.protocol}//${urlObj.hostname}`;
  } catch {
    return "";
  }
}

// Get favicon URL using Google's favicon service
export function getFaviconUrl(url: string): string {
  const baseUrl = getBaseUrl(url);
  if (!baseUrl) return "";

  // Use Google's favicon service
  return `https://www.google.com/s2/favicons?domain=${baseUrl}&sz=64`;
}

// For consistent icon display in the list
export function getIconForLink(url: string): Image.ImageLike {
  const faviconUrl = getFaviconUrl(url);
  return faviconUrl ? faviconUrl : Icon.Link;
}
