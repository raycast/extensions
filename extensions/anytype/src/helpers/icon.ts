import fetch from "node-fetch";
import { Icon } from "@raycast/api";
import { iconWidth } from "./constants";

/**
 * Determine which icon to show for a given Object. Icon can be url or emoji.
 */
export async function getIconWithFallback(icon: string, layout: string): Promise<string | Icon> {
  if (icon) {
    return (await getIcon(icon)) || icon;
  }

  // Fallback icons by layout
  switch (layout) {
    case "todo":
      return Icon.CheckCircle;
    case "set":
    case "collection":
      return Icon.List;
    case "participant":
      return Icon.PersonCircle;
    case "bookmark":
      return Icon.Bookmark;
    default:
      return Icon.Document;
  }
}

/**
 * Fetch an icon from local gateway and return it as a base64 data URI.
 */
export async function getIcon(iconUrl: string): Promise<string | undefined> {
  if (iconUrl && iconUrl.startsWith("http://127.0.0.1")) {
    const urlWithWidth = `${iconUrl}?width=${iconWidth}`;
    return (await fetchWithTimeout(urlWithWidth, 500)) || undefined;
  }

  return undefined;
}

/**
 * Fetch an icon, respecting a given timeout (in milliseconds).
 */
export async function fetchWithTimeout(url: string, timeout: number): Promise<string | undefined> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(id);
    if (response.ok) {
      const iconData = await response.arrayBuffer();
      return `data:image/png;base64,${Buffer.from(iconData).toString("base64")}`;
    }
  } catch (error) {
    console.log("Failed to fetch icon with timeout:", error);
  }

  return undefined;
}
