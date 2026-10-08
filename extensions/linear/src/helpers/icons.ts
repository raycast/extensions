import fs from "fs";

import { Image, environment } from "@raycast/api";
import * as emojis from "node-emoji";

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
    return emoji ?? fallbackIcon;
  }

  // Linear can add new icons from time to time so some icons may not be in the file system
  const filePath = `${environment.assetsPath}/linear-icons/${icon.toLowerCase()}.svg`;
  if (fs.existsSync(filePath)) {
    return { source: filePath, ...(color ? { tintColor: { light: color, dark: color, adjustContrast: true } } : {}) };
  }

  return fallbackIcon;
}
