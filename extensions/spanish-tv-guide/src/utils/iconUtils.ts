import Jimp from "jimp";
import * as fs from "fs";

const ICONS_DIRECTORY = "/tmp/raycast/spanish-tv-guide/icons";

const generateIcon = (icon: string) => {
  const path = iconPath(icon);
  if (!fs.existsSync(path)) return Jimp.read(icon).then((image) => image.contain(256, 256).write(path));
};

const iconPath = (icon: string) => `${ICONS_DIRECTORY}/${iconName(icon)}`;
const iconName = (icon: string) => icon.substring(icon.lastIndexOf("/") + 1);

export { iconPath, generateIcon };
