import { Color, environment, type Icon, type Image } from "@raycast/api";
import fs from "fs";
import path from "path";
import { buildIconPool, DEVICE_ICON_DIR, stateIconFile, SYSTEM_ICON_DIR, type PoolIcon } from "./priority/icon-pool";

const cache = new Map<string, string[]>();

/** SVG files in an assets folder. Empty when the folder is missing. */
function listFiles(dir: string): string[] {
  let files = cache.get(dir);
  if (!files) {
    try {
      files = fs.readdirSync(path.join(environment.assetsPath, dir));
    } catch {
      files = [];
    }
    cache.set(dir, files);
  }
  return files;
}

export const listSystemIconFiles = () => listFiles(SYSTEM_ICON_DIR);

export const getIconPool = (): PoolIcon[] => buildIconPool(listFiles(DEVICE_ICON_DIR));

/** Image source (relative to assets/) for a system icon file. */
export const systemIconSource = (file: string) => `${SYSTEM_ICON_DIR}/${file}`;

/** Image source (relative to assets/) for a device icon file from the pool. */
export const deviceIconSource = (file: string) => `${DEVICE_ICON_DIR}/${file}`;

/** Icon for an action or form item: a system SVG in the text color, or the built-in fallback. */
export const actionIcon = (file: string, fallback: Icon): Image => systemIcon(file, fallback, Color.PrimaryText);

/** One of our state icons tinted with `tintColor`, or a built-in icon when the SVG is not available. */
export function systemIcon(file: string, fallback: Icon, tintColor: Color.ColorLike): Image {
  const found = stateIconFile(file, listSystemIconFiles());
  return { source: found ? systemIconSource(found) : fallback, tintColor };
}
