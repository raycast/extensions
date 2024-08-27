import { useEffect, useState } from "react";
import { createWriteStream } from "node:fs";
import { access, constants, copyFile, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pipeline as streamPipeline } from "node:stream/promises";
import {
  Cache,
  Clipboard,
  Toast,
  confirmAlert,
  environment,
  getPreferenceValues,
  open,
  showHUD,
  showToast,
} from "@raycast/api";
import { execa } from "execa";
import got, { Progress } from "got";
import { titleToSlug } from "simple-icons/sdk";
import { JsDelivrNpmResponse, IconData, IconJson, LaunchContext } from "./types.js";

const cache = new Cache();

export const buildDeeplinkParameters = (launchContext?: LaunchContext) => {
  if (!launchContext) return "";
  return "?context=" + encodeURIComponent(JSON.stringify(launchContext));
};

export const downloadAssetPack = async (version: string) => {
  const toast = await showToast({
    style: Toast.Style.Animated,
    title: "",
    message: "Downloading asset pack",
  });
  return new Promise<void>((resolve) => {
    const readStream = got.stream(`https://codeload.github.com/simple-icons/simple-icons/zip/refs/tags/${version}`);
    const destination = join(environment.supportPath, `pack-${version}.zip`);
    readStream.on("response", async () => {
      await streamPipeline(readStream, createWriteStream(destination));
      resolve();
    });
    readStream.on("downloadProgress", (progress: Progress) => {
      if (progress.percent === 1) return;
      toast.message = `Downloading asset pack (${(progress.percent * 100).toFixed(0)}%)`;
    });
  });
};

export const extractAssetPack = async (version: string) => {
  await showToast({
    style: Toast.Style.Animated,
    title: "",
    message: "Extracting asset pack",
  });
  const zipPath = join(environment.supportPath, `pack-${version}.zip`);
  const destination = join(environment.assetsPath, `pack`);
  await execa("unzip", ["-o", zipPath, "-d", destination]);
};

export const cacheAssetPack = async (version: string) => {
  const zipPath = join(environment.supportPath, `pack-${version}.zip`);
  const destination = join(environment.assetsPath, `pack`);
  try {
    await access(zipPath, constants.R_OK | constants.W_OK);
    await access(destination, constants.R_OK | constants.W_OK);
  } catch {
    cache.set("cached-version", "");
    await cleanDownloadPack();
    await cleanAssetPack();
    await downloadAssetPack(version);
    await extractAssetPack(version);
    cache.set("cached-version", version);
  }
};

export const loadCachedJson = async (version: string) => {
  const jsonPath = join(environment.assetsPath, "pack", `simple-icons-${version}`, "_data", "simple-icons.json");
  const jsonFile = await readFile(jsonPath, "utf8");
  return JSON.parse(jsonFile) as IconJson;
};

export const loadCachedVersion = () => {
  return cache.get("cached-version") ?? "";
};

export const loadLatestVersion = async () => {
  await showToast({
    style: Toast.Style.Animated,
    title: "",
    message: "Checking latest version",
  });
  const json = await got.get("https://data.jsdelivr.com/v1/packages/npm/simple-icons").json<JsDelivrNpmResponse>();
  return json.tags.latest;
};

export const useVersion = ({ launchContext }: { launchContext?: LaunchContext }) => {
  const cachedVersion = loadCachedVersion();
  const [version, setVerion] = useState(cachedVersion);
  useEffect(() => {
    loadLatestVersion().then(async (latestVersion) => {
      if (cachedVersion !== latestVersion) {
        if (cachedVersion) {
          cache.set("cached-version", "");
          const confirmed = await confirmAlert({
            title: "New version available",
            message: "Do you want to reload the command to apply updates?",
          });
          if (confirmed) {
            open("raycast://extensions/litomore/simple-icons/index" + buildDeeplinkParameters(launchContext));
          }
        } else {
          setVerion(latestVersion);
        }
      }
    });
  }, []);
  return version;
};

export const loadSvg = async ({ version, icon, slug }: { version: string; icon: IconData; slug: string }) => {
  const { defaultLoadSvgAction = "WithBrandColor" } = getPreferenceValues<ExtensionPreferences>();
  const svgPath = join(environment.assetsPath, "pack", `simple-icons-${version}`, "icons", `${slug}.svg`);
  let svg = await readFile(svgPath, "utf8");
  const withBrandColor = defaultLoadSvgAction === "WithBrandColor";
  if (withBrandColor) svg = svg.replace("<svg ", `<svg fill="#${icon.hex}" `);
  return { svg, path: svgPath, withBrandColor };
};

export const copySvg = async ({ version, icon }: { version: string; icon: IconData }) => {
  const toast = await showToast({
    style: Toast.Style.Success,
    title: "",
    message: "Fetching icon...",
  });
  const { svg } = await loadSvg({
    version,
    icon,
    slug: icon.slug || titleToSlug(icon.title),
  });
  toast.style = Toast.Style.Success;
  Clipboard.copy(svg);
  await showHUD("Copied to Clipboard");
};

export const cleanDownloadPack = async () => {
  const directories = await readdir(environment.supportPath);
  await Promise.all(
    directories
      .filter((d) => d.startsWith("pack-"))
      .map((d) => rm(join(environment.supportPath, d), { recursive: true, force: true })),
  );
};

export const cleanAssetPack = async () => {
  const directories = await readdir(environment.assetsPath);
  await Promise.all(
    directories
      .filter((d) => d.startsWith("pack"))
      .map((d) => rm(join(environment.assetsPath, d), { recursive: true, force: true })),
  );
};

export const makeCopyToDownload = async ({
  version,
  icon,
  slug,
}: {
  version: string;
  icon: IconData;
  slug: string;
}) => {
  const { svg, path: savedPath, withBrandColor } = await loadSvg({ version, icon, slug });
  const tmpPath = join(tmpdir(), `${slug}.svg`);
  try {
    if (withBrandColor) {
      await writeFile(tmpPath, svg, "utf8");
    } else {
      await copyFile(savedPath, tmpPath);
    }
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
