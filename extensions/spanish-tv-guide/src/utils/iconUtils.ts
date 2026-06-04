import { Jimp } from "jimp";
import * as fs from "fs";

const ICONS_DIRECTORY = "/tmp/raycast/spanish-tv-guide/icons";

const generateIcon = async (icon: string) => {
  const path = iconPath(icon);
  if (!fs.existsSync(path)) {
    const image = await Jimp.read(icon);
    await image.contain({ w: 256, h: 256 }).write(path as `${string}.${string}`);
  }
};

const iconPath = (icon: string) => `${ICONS_DIRECTORY}/${iconName(icon)}`;
const iconName = (icon: string) => icon.substring(icon.lastIndexOf("/") + 1);

export { iconPath, generateIcon };
