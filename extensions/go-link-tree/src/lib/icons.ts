import type { Image } from "@raycast/api";
import { Icon } from "@raycast/api";

/**
 * Resolves an icon string to a Raycast-compatible icon source.
 * Supports:
 * - Iconify icons (e.g., "iconify:simple-icons:github", "iconify:devicon:react-original")
 * - SimpleIcons shorthand (e.g., "github", "gitlab", "slack") - alphanumeric names
 * - Raycast Icon enum keys (e.g., "Link", "Globe", "Code")
 * - SF Symbols (e.g., "sf-symbol:house.fill" or "house.fill")
 * - URL icons (e.g., "https://example.com/icon.png")
 * - Custom asset paths (e.g., "icon.png")
 */
export function resolveIcon(iconString?: string): Icon | Image.ImageLike {
  if (!iconString) {
    return Icon.Link;
  }

  // Check if it's an Iconify icon (format: "iconify:icon-set:icon-name")
  if (iconString.startsWith("iconify:")) {
    const parts = iconString.split(":");
    if (parts.length === 3) {
      const [, iconSet, iconName] = parts;
      return {
        source: `https://api.iconify.design/${iconSet}/${iconName}.svg`,
      };
    }
  }

  // Check if it's a URL
  if (iconString.startsWith("http://") || iconString.startsWith("https://")) {
    return { source: iconString };
  }

  // Try to match Raycast Icon enum
  const iconKey = iconString as keyof typeof Icon;
  if (Icon[iconKey]) {
    return Icon[iconKey];
  }

  // Check if it's an SF Symbol (starts with "sf-symbol:" or "sf.")
  if (iconString.startsWith("sf-symbol:") || iconString.startsWith("sf.")) {
    const sfSymbol = iconString.startsWith("sf-symbol:")
      ? iconString.slice(10)
      : iconString.slice(3);
    return { source: `sf-symbol:${sfSymbol}` };
  }

  // Check if it's a custom asset path (has file extension)
  if (/\.(png|jpg|jpeg|svg|gif)$/i.test(iconString)) {
    return { source: iconString };
  }

  // If it contains dots, it might be an SF Symbol name (e.g., "house.fill")
  if (iconString.includes(".")) {
    return { source: `sf-symbol:${iconString}` };
  }

  // Assume it's a SimpleIcons icon name (e.g., "github", "gitlab", "slack")
  // This allows shorthand like icon: "github" instead of icon: "iconify:simple-icons:github"
  if (/^[a-z0-9]+$/i.test(iconString)) {
    return {
      source: `https://api.iconify.design/simple-icons/${iconString.toLowerCase()}.svg`,
    };
  }

  // Default: return Link icon
  return Icon.Link;
}
