import { useEffect, useMemo, useState } from "react";
import { createWriteStream } from "node:fs";
import { access, constants, copyFile, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pipeline as streamPipeline } from "node:stream/promises";
import {
  AI,
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
import { useAI } from "@raycast/utils";
import { Searcher } from "fast-fuzzy";
import got, { Progress } from "got";
import spawn from "nano-spawn";
import { getIconSlug } from "simple-icons/sdk";
import { IconData, JsDelivrNpmResponse, LaunchContext, Release } from "./types.js";

const cache = new Cache();

export const fontUnicodeStart = 0xea01;

export const {
  defaultDetailAction = "OpenWith",
  defaultLoadSvgAction = "WithBrandColor",
  displaySimpleIconsFontFeatures,
  enableAiSearch,
  githubToken,
} = getPreferenceValues<ExtensionPreferences>();

export const hasAccessToAi = environment.canAccess(AI);

export const buildDeeplinkParameters = (launchContext?: LaunchContext) => {
  if (!launchContext) return "";
  return "?context=" + encodeURIComponent(JSON.stringify(launchContext));
};

export const downloadAssetPack = async (version: string) => {
  const toast = await showToast({
    style: Toast.Style.Animated,
    title: "Downloading asset pack",
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
      toast.title = `Downloading asset pack (${(progress.percent * 100).toFixed(0)}%)`;
    });
  });
};

export const extractAssetPack = async (version: string) => {
  await showToast({
    style: Toast.Style.Animated,
    title: "Extracting asset pack",
  });
  const zipPath = join(environment.supportPath, `pack-${version}.zip`);
  const destination = join(environment.assetsPath, `pack`);
  await spawn("unzip", ["-o", zipPath, "-d", destination]);
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
  const [major] = version.split(".");
  const isNewFormat = Number(major) >= 14;
  const jsonPath = join(environment.assetsPath, "pack", `simple-icons-${version}`, "_data", "simple-icons.json");
  const jsonFile = await readFile(jsonPath, "utf8");
  const json = JSON.parse(jsonFile);
  const icons = isNewFormat ? (json as IconData[]) : (json.icons as IconData[]);
  return icons.map((icon, i) => ({ ...icon, code: fontUnicodeStart + i }));
};

export const loadCachedVersion = () => {
  return cache.get("cached-version") ?? "";
};

export const loadLatestVersion = async () => {
  await showToast({
    style: Toast.Style.Animated,
    title: "Checking latest version",
  });
  const json = await got.get("https://data.jsdelivr.com/v1/packages/npm/simple-icons").json<JsDelivrNpmResponse>();
  return json.tags.latest;
};

export const loadRecentReleases = async () =>
  got
    .get("https://api.github.com/repos/simple-icons/simple-icons/releases", {
      headers: {
        Accept: "application/vnd.github+json",
        Authorization: githubToken ? `Bearer ${githubToken}` : undefined,
        "X-GitHub-Api-Version": "2022-11-28",
      },
    })
    .json<Release[]>();

export const useVersion = ({ launchContext }: { launchContext?: LaunchContext }) => {
  const cachedVersion = loadCachedVersion();
  const [version, setVersion] = useState(cachedVersion);
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
          setVersion(latestVersion);
        }
      }
    });
  }, []);
  return version;
};

export const loadSvg = async ({ version, icon, slug }: { version: string; icon: IconData; slug: string }) => {
  const svgPath = join(environment.assetsPath, "pack", `simple-icons-${version}`, "icons", `${slug}.svg`);
  let svg = await readFile(svgPath, "utf8");
  const withBrandColor = defaultLoadSvgAction === "WithBrandColor";
  if (withBrandColor) svg = svg.replace("<svg ", `<svg fill="#${icon.hex}" `);
  return { svg, path: svgPath, withBrandColor };
};

export const copySvg = async ({ version, icon, pathOnly }: { version: string; icon: IconData; pathOnly?: boolean }) => {
  const toast = await showToast({
    style: Toast.Style.Success,
    title: "Fetching icon...",
  });
  let { svg } = await loadSvg({
    version,
    icon,
    slug: getIconSlug(icon),
  });
  if (pathOnly) svg = svg.replace(/^.+ d="([^"]+)".+$/, "$1");
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

export const getKeywords = (icon: IconData) =>
  [
    icon.title,
    icon.slug,
    icon.aliases?.aka,
    icon.aliases?.dup?.map((duplicate) => duplicate.title),
    Object.values(icon.aliases?.loc ?? {}),
  ]
    .flat()
    .filter(Boolean) as string[];

export const useSearch = ({ icons }: { icons: IconData[] }) => {
  const [searchString, setSearchString] = useState("");
  const $searchString = searchString.trim().toLowerCase();
  const searcher = useMemo(() => new Searcher(icons, { keySelector: getKeywords }), [icons]);

  const filteredIcons = $searchString
    ? enableAiSearch && hasAccessToAi
      ? icons.filter((icon) => getKeywords(icon).some((text) => text.toLowerCase().includes($searchString)))
      : searcher.search($searchString)
    : icons;

  const searchPrompt = [
    `Here is the full icon data JSON for brand icons in array below:`,
    JSON.stringify(icons.map((icon) => ({ title: icon.title, slug: icon.slug, hex: icon.hex, source: icon.source }))),
    "The 'title' means the company or project names, 'source' means the icon resource URL or company website, 'hex' means the icon color in hex code.",
    `Please search from the data with the search keyword "${$searchString}". And return at least one icon slug in the format below:`,
    "(icon slugs only, split with comma, up to 500 items, no markdown format, don't change data structure, no addition text, no spaces, do not return non-exist slugs)",
  ].join("\n");
  const execute = enableAiSearch && Boolean(searchString) && hasAccessToAi && filteredIcons.length === 0;
  const { data, isLoading: aiIsLoading } = useAI(searchPrompt, { execute, model: AI.Model["OpenAI_GPT4o-mini"] });
  const searchResult = execute ? icons.filter((icon) => data.split(",").includes(icon.slug)) : filteredIcons;
  return { aiIsLoading, searchResult, setSearchString };
};
