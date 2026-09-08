import { Icon, Image, Color } from "@raycast/api";
import { existsSync } from "node:fs";
import { pathToFileURL } from "node:url";

export interface AvatarOptions {
  photo?: string;
  name: string;
  type?: "private" | "group" | "supergroup" | "channel";
}

function getFallbackIcon(type: AvatarOptions["type"]): Icon {
  switch (type) {
    case "private":
      return Icon.PersonCircle;
    case "group":
    case "supergroup":
      return Icon.TwoPeople;
    case "channel":
      return Icon.Megaphone;
    default:
      return Icon.Message;
  }
}

export function getAvatarIcon(options: AvatarOptions): Image.ImageLike {
  const fallbackIcon = getFallbackIcon(options.type);

  if (options.photo && existsSync(options.photo)) {
    return {
      // Raycast's Windows renderer expects local images as file URLs. Passing
      // the raw C:\\... path results in an empty placeholder icon.
      source: pathToFileURL(options.photo).href,
      fallback: fallbackIcon,
      mask: Image.Mask.Circle,
    };
  }

  // Generate a consistent color based on name
  const colors = [Color.Blue, Color.Green, Color.Orange, Color.Purple, Color.Red, Color.Magenta, Color.Yellow];

  // Simple hash function for the name
  let hash = 0;
  for (let i = 0; i < options.name.length; i++) {
    hash = options.name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const colorIndex = Math.abs(hash) % colors.length;

  return {
    source: fallbackIcon,
    tintColor: colors[colorIndex],
  };
}
