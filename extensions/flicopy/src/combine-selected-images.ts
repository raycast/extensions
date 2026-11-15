import { Toast, getSelectedFinderItems, showToast } from "@raycast/api";
import { extname } from "node:path";
import { pathToFileURL } from "node:url";
import { runFlicopy } from "./flicopy";

const imageExtensions = new Set([".png", ".jpg", ".jpeg", ".heic", ".heif", ".tif", ".tiff", ".webp", ".gif", ".bmp"]);

export default async function Command() {
  let paths: string[];
  try {
    paths = (await getSelectedFinderItems()).map((item) => item.path);
  } catch {
    await showToast({ style: Toast.Style.Failure, title: "Select images in Finder first" });
    return;
  }

  const images = paths.filter((path) => imageExtensions.has(extname(path).toLowerCase()));
  if (images.length < 2) {
    await showToast({ style: Toast.Style.Failure, title: "Select two or more images in Finder" });
    return;
  }

  // Images are combined in the order Finder returns them.
  const query = images.map((path) => `file=${encodeURIComponent(pathToFileURL(path).href)}`).join("&");
  await runFlicopy(`open/combine?${query}`);
}
