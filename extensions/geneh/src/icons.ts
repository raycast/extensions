import { environment, Icon, type Image } from "@raycast/api";
import { existsSync } from "node:fs";
import { join } from "node:path";

const has = (path: string) => existsSync(join(environment.assetsPath, path));

/** The currency's flag. */
export const flag = (code: string): Image.ImageLike => ({ source: `flags/${code}.svg` });

/** The bank's own logo, shown bare, or a plain bank icon when Geneh has none for it. */
export const bankLogo = (id: string): Image.ImageLike =>
  has(`banks/${id}.svg`) ? { source: `banks/${id}.svg` } : Icon.Building;
