import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
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

export const imageTypeSpecs: Record<
  ImageType,
  {
    aspectRatio: AspectRatio;
    imageFit: Grid.Fit;
    gridColumns: number;
    websitePathname: string;
  }
> = {
  [ImageType.Grids]: {
    aspectRatio: "2/3",
    gridColumns: 5,
    imageFit: Grid.Fit.Fill,
    websitePathname: "grid",
  },
  [ImageType.Heroes]: {
    aspectRatio: "16/9",
    gridColumns: 4,
    imageFit: Grid.Fit.Fill,
    websitePathname: "hero",
  },
  [ImageType.Logos]: {
    aspectRatio: "1",
    gridColumns: 5,
    imageFit: Grid.Fit.Contain,
    websitePathname: "logo",
  },
  [ImageType.Icons]: {
    aspectRatio: "1",
    gridColumns: 5,
    imageFit: Grid.Fit.Contain,
    websitePathname: "icon",
  },
};

export const downloadImage = async (url: string) => {
  const targetPath = path.join(os.homedir(), "Downloads", path.basename(url));
  const file = await got(url).buffer();
  await fs.writeFile(targetPath, file);
  return targetPath;
};

export const tagColors = {
  steam: "#000000",
  gog: "#86328A",
};
