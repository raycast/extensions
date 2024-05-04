import { access, constants, copyFile, mkdir, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { environment } from "@raycast/api";
import got from "got";
import { JsDelivrNpmResponse, IconData, IconJson } from "./types.js";

export const loadLatestVersion = async () => {
  const json = await got.get("https://data.jsdelivr.com/v1/packages/npm/simple-icons").json<JsDelivrNpmResponse>();
  return json.tags.latest;
};

export const loadJson = async (version: string) => {
  const json = await got
    .get(`https://cdn.jsdelivr.net/npm/simple-icons@${version}/_data/simple-icons.json`, {
      headers: {
        "Cache-Control": "no-cache",
      },
    })
    .json<IconJson>();
  return json;
};

export const loadSvg = async (version: string, slug: string) => {
  const savedPath = await getSavedIconPath(version, slug);

  try {
    await access(savedPath, constants.R_OK | constants.W_OK);
    const svg = await readFile(savedPath, "utf8");
    return { svg, path: savedPath };
  } catch {
    const iconUrl = `https://cdn.jsdelivr.net/npm/simple-icons@${version}/icons/${slug}.svg`;
    const svg = await got.get(iconUrl).text();
    await writeFile(savedPath, svg, "utf8");
    return { svg, path: savedPath };
  }
};

export const getSavedIconPath = async (version: string, slug: string) => {
  const savePath = `saved-${version}`;
  const destinationPath = join(environment.supportPath, savePath, `${slug}.svg`);
  return destinationPath;
};

export const initSavePath = async (version: string) => {
  const savePath = join(environment.supportPath, `saved-${version}`);
  try {
    await access(savePath, constants.R_OK | constants.W_OK);
  } catch {
    await mkdir(savePath);
  }
};

export const cleanSavedPaths = async () => {
  const directories = await readdir(environment.supportPath);
  await Promise.all(
    directories
      .filter((d) => d.startsWith("saved-"))
      .map((d) => rm(join(environment.supportPath, d), { recursive: true, force: true })),
  );
};

export const makeCopyToDownload = async (version: string, slug: string) => {
  const { path: savedPath } = await loadSvg(version, slug);
  const tmpPath = join(tmpdir(), `${slug}.svg`);

  try {
    await copyFile(savedPath, tmpPath);
  } catch {
    console.error("Failed to copy file");
  }

  return tmpPath;
};

export const getAliases = (icon: IconData) => {
  const aka = icon.aliases?.aka ?? [];
  const dup = icon.aliases?.dup?.map((d) => [d.title, ...Object.values(d.loc ?? {})]).flat() ?? [];
  const loc = Object.values(icon.aliases?.loc ?? {});
  return [...new Set([...aka, ...dup, ...loc])];
};
