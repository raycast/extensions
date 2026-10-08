import { Icon, Image } from "@raycast/api";
import { existsSync } from "fs";
import { resolve, join } from "path";

// Cache for icon existence checks
const iconCache = new Map<string, boolean>();

const assetsDir = resolve(__dirname, "..", "assets");

function localIconExists(fileName: string): boolean {
  if (iconCache.has(fileName)) return iconCache.get(fileName)!;
  const exists = existsSync(join(assetsDir, "icons", fileName));
  iconCache.set(fileName, exists);
  return exists;
}

/**
 * Returns the best available icon source for a currency.
 * Priority: local bundled icon → remote URL → fallback.
 */
export function currencyIcon(
  iconPath: string | null | undefined,
): Image.ImageLike {
  if (!iconPath) return Icon.Coins;

  const fileName = iconPath.split("/").pop() || "";
  if (!fileName) return Icon.Coins;

  if (localIconExists(fileName)) {
    return { source: `icons/${fileName}` };
  }

  return {
    source: `https://kurslog.com${iconPath}`,
    fallback: Icon.Coins,
  };
}
