import { Image, environment } from "@raycast/api";
import emojis from "node-emoji";
import fs from "fs";

type GetIconParams = {
  icon?: string;
  color?: string;
  fallbackIcon: Image.ImageLike;
};

export function getIcon({ icon, color, fallbackIcon }: GetIconParams) {
  if (!icon) {
    return fallbackIcon;
  }

  const emojiRegex = /:(.*):/;
  if (emojiRegex.test(icon)) {
    const emoji = emojis.get(icon);
    // if there's no corresponding emoji, the same emoji code is returned
    return emoji === icon ? fallbackIcon : emoji;
  }

  // Linear can add new icons from time to time so some icons may not be in the file system
  const filePath = `${environment.assetsPath}/linear-icons/${icon.toLowerCase()}.svg`;
  if (fs.existsSync(filePath)) {
    return { source: filePath, tintColor: color };
  }

  return fallbackIcon;
}
