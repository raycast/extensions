import { Icon, Image } from "@raycast/api";
import { BrowserAsset } from "../../controllers/BrowserController";
import { ClipboardAsset } from "../../controllers/ClipboardController";
import getClassificationIcon from "../converters/getClassificationIcon";
import isImage from "../isImage";
import { StrippedAsset } from "../../types/strippedAsset";

/**
 * Get a raycast icon for a clipboard item
 * @param item the clipboard item
 * @returns a raycast icon
 */
export default function getIcon(
  item: ClipboardAsset | BrowserAsset | StrippedAsset,
): Image.ImageLike {
  if ("clipboard" in item && item.clipboard.file && isImage(item.ext)) {
    return Icon.Image;
  }

  if (item.ext) {
    return { source: getClassificationIcon(item.ext) };
  }

  return Icon.Text;
}
