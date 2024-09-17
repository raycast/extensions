import type { Doc } from "@/type";

export const WEBSITE = "https://es6.ruanyifeng.com";
export function getDocUrl(item: Doc) {
  return `${WEBSITE}/#${item.filePath}`;
}
