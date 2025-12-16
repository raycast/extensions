import { Icon, Image } from "@raycast/api";
import fetch from "node-fetch";
import { IconFormat, IconName, ObjectIcon, ObjectLayout, RawType } from "../models";
import { colorToHex, iconWidth } from "./constant";

/**
 * Determine which icon to show for a given Object. Icon can be url or emoji.
 * @param icon The icon of the object.
 * @param layout The layout of the object.
 * @param type The type of the object .
 * @returns The base64 data URI or Raycast Icon.
 */
export async function getIconWithFallback(
  icon: ObjectIcon | null,
  layout: string,
  type?: RawType | null,
): Promise<Image.ImageLike> {
  if (icon && icon.format) {
    // type built-in icons
    if (icon.format === IconFormat.Icon && icon.name) {
      return getCustomTypeIcon(icon.name, icon.color);
    }

    // file reference
    if (icon.format === IconFormat.File && icon.file) {
      const fileSource = await getFile(icon.file);
      if (fileSource) {
        return { source: fileSource, mask: getMaskForObject(icon.file, layout) };
      }
    }

    // regular emoji
    if (icon.format === IconFormat.Emoji && icon.emoji) {
      return icon.emoji;
    }
  }

  // fallback to grey version of type built-in icon
  if (type && type.icon && type.icon.format === IconFormat.Icon && type.icon.name) {
    return getCustomTypeIcon(type.icon.name, "grey");
  }

  // fallback to layout
  return await fallbackToLayout(layout);
}

/**
 * Fallback to a default icon based on the layout.
 * @param layout The layout of the object.
 * @returns The base64 data URI or Raycast Icon.
 */
async function fallbackToLayout(layout: string): Promise<Image.ImageLike> {
  switch (layout) {
    case ObjectLayout.Action:
      return getCustomTypeIcon(IconName.Checkbox, "grey");
    case ObjectLayout.Set:
    case ObjectLayout.Collection:
      return getCustomTypeIcon(IconName.Layers, "grey");
    case ObjectLayout.Participant:
      return getCustomTypeIcon(IconName.Person, "grey");
    case ObjectLayout.Bookmark:
      return getCustomTypeIcon(IconName.Bookmark, "grey");
    case "type":
      return getCustomTypeIcon(IconName.ExtensionPuzzle, "grey");
    case "template":
      return getCustomTypeIcon(IconName.Copy, "grey");
    case "space":
      return { source: "icons/space/space.svg", tintColor: { light: colorToHex["grey"], dark: colorToHex["grey"] } };
    case "chat":
      return { source: "icons/space/chat.svg", tintColor: { light: colorToHex["grey"], dark: colorToHex["grey"] } };
    default:
      return getCustomTypeIcon(IconName.Document, "grey");
  }
}

/**
 * Retrieve a custom type icon by name from the local assets directory.
 * @param name The name of the icon file (without extension).
 * @param color The color of the icon.
 * @returns The base64 data URI of the icon.
 */
export function getCustomTypeIcon(name: string, color?: string): Image.ImageLike {
  return {
    source: `icons/type/${name}.svg`,
    tintColor: {
      light: colorToHex[color || "grey"],
      dark: colorToHex[color || "grey"],
    },
  };
}

/**
 * Fetch an icon from local gateway and return it as a base64 data URI.
 * @param iconUrl The URL of the icon.
 * @returns The base64 data URI of the icon or undefined.
 */
export async function getFile(iconUrl: string): Promise<string | undefined> {
  if (iconUrl && iconUrl.startsWith("http://127.0.0.1")) {
    const urlWithWidth = `${iconUrl}?width=${iconWidth}`;
    return (await fetchWithTimeout(urlWithWidth, 500)) || undefined;
  }

  return undefined;
}

/**
 * Fetch an icon, respecting a given timeout (in milliseconds).
 * @param url The URL of the icon.
 * @param timeout The timeout in milliseconds.
 * @returns The base64 data URI of the icon or undefined.
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

/**
 * Determine which mask to use for a given Object.
 * @param icon The icon of the object.
 * @param layout The layout of the object.
 * @returns The mask to use for the object.
 */
export function getMaskForObject(icon: Image.ImageLike, layout: string): Image.Mask {
  return (layout === ObjectLayout.Participant || layout === ObjectLayout.Profile || layout === "chat") &&
    icon != Icon.Document
    ? Image.Mask.Circle
    : Image.Mask.RoundedRectangle;
}
