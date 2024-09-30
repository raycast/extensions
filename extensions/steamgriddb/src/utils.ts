import { writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, join } from "node:path";
import { Grid, getPreferenceValues } from "@raycast/api";
import got from "got";
import SGDB from "steamgriddb";
import { AspectRatio, ImageType } from "./types.js";

const { apiKey } = getPreferenceValues<ExtensionPreferences>();

export const db = new SGDB(apiKey);

export const imageTypes: ImageType[] = [
  ImageType.Grids,
  ImageType.Heroes,
  ImageType.Logos,
  ImageType.Icons,
];

export const websitePathname: Record<ImageType, string> = {
  [ImageType.Grids]: "grid",
  [ImageType.Heroes]: "hero",
  [ImageType.Logos]: "logo",
  [ImageType.Icons]: "icon",
};

export const getImageAspectRatio = (imageType: ImageType): AspectRatio => {
  switch (imageType) {
    case ImageType.Grids:
      return "2/3";
    case ImageType.Heroes:
      return "16/9";
    case ImageType.Logos:
    case ImageType.Icons:
    default:
      return "1";
  }
};

export const getImageFit = (imageType: ImageType): Grid.Fit => {
  switch (imageType) {
    case ImageType.Grids:
    case ImageType.Heroes:
      return Grid.Fit.Fill;
    case ImageType.Logos:
    case ImageType.Icons:
    default:
      return Grid.Fit.Contain;
  }
};

export const downloadImage = async (url: string) => {
  const targetPath = join(tmpdir(), basename(url));
  const file = await got(url).buffer();
  await writeFile(targetPath, file);
  return targetPath;
};

export const tagColors = {
  steam: "#000000",
  gog: "#86328A",
};
