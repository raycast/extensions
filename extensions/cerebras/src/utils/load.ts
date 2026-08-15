import { Clipboard } from "@raycast/api";
import fs from "fs/promises";
import { imageMeta } from "image-meta";
import path from "path";
import { runAppleScript } from "run-applescript";

type ImageMeta = {
  type: string;
  height: number;
  width: number;
};

export type LoadFrom = { data: Buffer; type: ImageMeta };

const getType = async (data: Buffer, image: string): Promise<ImageMeta> => {
  const meta = await imageMeta(data);
  const type = meta.type ?? (path.extname(image).slice(1) || "png");
  const height = meta.height ?? 0;
  const width = meta.width ?? 0;
  return { type, height, width };
};

export const loadFromFinder = async (): Promise<LoadFrom | undefined> => {
  const selectedImages = await getFinderSelectedImages();
  if (!selectedImages?.length) {
    return;
  }

  const image = selectedImages[0];
  const data = await fs.readFile(image);
  const type = await getType(data, image);

  return { data, type };
};

export const loadFromClipboard = async () => {
  let { file: image } = await Clipboard.read();
  if (!image) {
    return;
  }

  image = decodeURIComponent(image);

  if (image.startsWith("file://")) {
    image = image.slice(7);
  }

  const data = await fs.readFile(image);
  const type = await getType(data, image);

  return { data, type };
};

/**
 * Gets currently selected images in Finder.
 *
 * @returns A promise resolving to the comma-separated list of images as a string.
 */
const getFinderSelectedImages = async (): Promise<string[]> => {
  const result = await runAppleScript(
    `\
set imageTypes to {"PNG", "JPG", "JPEG", "TIF", "HEIF", "GIF", "ICO", "ICNS", "ASTC", "BMP", "DDS", "EXR", "JP2", "KTX", "Portable Bitmap", "Adobe Photoshop", "PVR", "TGA", "WebP", "SVG", "PDF", "HEIC"}

tell application "Finder"
  set theSelection to selection
  if theSelection is {} then
    return
  else if (theSelection count) is equal to 1 then
    repeat with imageType in imageTypes
      if (kind of the first item of theSelection) contains imageType then
        return the POSIX path of (theSelection as alias)
        exit repeat
      end if
    end repeat
  else
    set thePaths to {}
    repeat with i from 1 to (theSelection count)
      repeat with imageType in imageTypes
        if (kind of (item i of theSelection)) contains imageType then
          copy (POSIX path of (item i of theSelection as alias)) to end of thePaths
          exit repeat
        end if
      end repeat
    end repeat
    return thePaths
  end if
end tell`,
  );
  return result.split(/,\s+/g).filter((item) => !!item);
};
