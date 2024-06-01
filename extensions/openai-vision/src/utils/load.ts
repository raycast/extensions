import { Clipboard } from "@raycast/api";
import fs from "fs/promises";
import { imageMeta } from "image-meta";
import path from "path";
import { getFinderSelectedImages } from "../utils/get-finder-selected-images";

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
