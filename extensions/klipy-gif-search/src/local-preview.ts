import { pathToFileURL } from "node:url";

export function localPreviewSource(
  filePath: string,
  platform = process.platform,
  toFileUrl = (value: string) => pathToFileURL(value).href,
) {
  return platform === "win32" ? toFileUrl(filePath) : filePath;
}
