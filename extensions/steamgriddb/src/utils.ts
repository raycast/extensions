import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { Grid, getPreferenceValues } from "@raycast/api";
import ky from "ky";
import SGDB from "steamgriddb";
import { AspectRatio, ImageTypeValue } from "./types.js";

export const preferences = getPreferenceValues<ExtensionPreferences>();
const { apiKey } = preferences;

export const db = new SGDB(apiKey);

export const imageTypeSpecs: Record<
  ImageTypeValue,
  {
    aspectRatio: AspectRatio;
    imageFit: Grid.Fit;
    gridColumns: number;
    websitePathname: string;
  }
> = {
  Grids: {
    aspectRatio: "2/3",
    gridColumns: 5,
    imageFit: Grid.Fit.Fill,
    websitePathname: "grid",
  },
  Heroes: {
    aspectRatio: "16/9",
    gridColumns: 4,
    imageFit: Grid.Fit.Fill,
    websitePathname: "hero",
  },
  Logos: {
    aspectRatio: "1",
    gridColumns: 5,
    imageFit: Grid.Fit.Contain,
    websitePathname: "logo",
  },
  Icons: {
    aspectRatio: "1",
    gridColumns: 5,
    imageFit: Grid.Fit.Contain,
    websitePathname: "icon",
  },
};

export const downloadImage = async (url: string, downloadPath: string) => {
  const destination =
    downloadPath.trim() || path.join(os.homedir(), "Downloads");
  const targetPath = path.join(
    destination,
    path.basename(new URL(url).pathname),
  );

  try {
    const file = await ky(url, { timeout: 30_000 }).arrayBuffer();
    await fs.writeFile(targetPath, Buffer.from(file));
    return targetPath;
  } catch (error) {
    throw new Error(`Could not download image. Reason: ${String(error)}`);
  }
};

export const tagColors = {
  steam: "#000000",
  gog: "#86328A",
};
