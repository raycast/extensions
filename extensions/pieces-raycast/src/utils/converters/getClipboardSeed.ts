import * as path from "path";
import { ClassificationSpecificEnum } from "@pieces.app/pieces-os-client";
import { Clipboard } from "@raycast/api";
import { getClassificationSpecificEnum } from "./getClassificationSpecificEnum";
import { ClipboardAsset } from "../../controllers/ClipboardController";

/**
 * Generates a ClipboardAsset object from the provided Clipboard.ReadContent item.
 *
 * @param {Clipboard.ReadContent} item - The clipboard content to process.
 * @returns {ClipboardAsset} The generated ClipboardAsset object.
 */
export default function getClipboardSeed(
  item: Clipboard.ReadContent,
): ClipboardAsset {
  const seed: ClipboardAsset = { clipboard: item };

  if (item.file) {
    const ext = path.extname(item.file);
    seed.ext = getClassificationSpecificEnum(ext);
    if (!ext) seed.ext = ClassificationSpecificEnum.Png;
  }

  return seed;
}
