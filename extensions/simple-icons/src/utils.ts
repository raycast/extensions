import { useEffect, useMemo, useState } from "react";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import {
  AI,
  Cache,
  Clipboard,
  LaunchType,
  Toast,
  confirmAlert,
  environment,
  getPreferenceValues,
  open,
  showHUD,
  showToast,
} from "@raycast/api";
import { showFailureToast, useAI } from "@raycast/utils";
import { Searcher } from "fast-fuzzy";
import got from "got";
import pacote from "pacote";
import { crossLaunchCommand } from "raycast-cross-extension";
import { getIconSlug } from "./vender/simple-icons-sdk.js";
import { IconData, LaunchContext, Release } from "./types.js";

const cache = new Cache();

export const fontUnicodeStart = 0xea01;

export const {
  defaultDetailAction = "OpenWith",
  defaultLoadSvgAction = "WithBrandColor",
  displaySimpleIconsFontFeatures,
  enableAiSearch,
  githubToken,
  releaseVersion,
} = getPreferenceValues<ExtensionPreferences>();

export const hasAccessToAi = environment.canAccess(AI);

export const buildDeeplinkParameters = (launchContext?: LaunchContext) => {
  if (!launchContext) return "";
  return "?context=" + encodeURIComponent(JSON.stringify(launchContext));
};

export const pacoteAssetPack = async (version: string) => {
  await showToast({
    style: Toast.Style.Animated,
    title: "Downloading asset pack",
  });
  await pacote.extract(releaseVersion, path.join(environment.assetsPath, "pack", version));
};

export const cacheAssetPack = async (version: string) => {
  const destination = path.join(environment.assetsPath, "pack", version);
  try {
    await fs.access(destination, fs.constants.R_OK | fs.constants.W_OK);
  } catch {
    cache.set("cached-version", "");
    await cleanAssetPack();
    await pacoteAssetPack(version);
    cache.set("cached-version", version);
  }
};

export const loadCachedJson = async (version: string) => {
  const legacyJsonPath = path.join(environment.assetsPath, "pack", version, "_data", "simple-icons.json");
  const newJsonPath = path.join(environment.assetsPath, "pack", version, "data", "simple-icons.json");
  const extremeJsonPath = path.join(environment.assetsPath, "pack", version, "distribution", "icons.json");
  const [newJsonFile, legacyJsonFile, extremeJsonFile] = await Promise.all(
    [newJsonPath, legacyJsonPath, extremeJsonPath].map((p) => fs.readFile(p, "utf8").catch(() => "")),
  );
  const jsonFile = newJsonFile || legacyJsonFile || extremeJsonFile || "[]";
  const json = JSON.parse(jsonFile);
  const icons = (json.icons ? json.icons : json) as IconData[];
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

  const [left, right] = releaseVersion.split(":");
  if (right && left !== "npm") {
    throw new Error(
      [
        `Unsupported version format "${releaseVersion}".`,
        "Please refer to the preference description to learn how to specify release version.",
      ].join(" "),
    );
  }
  const { name, version } = await pacote.manifest(releaseVersion);
  return `${name}@${version}`;
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
    loadLatestVersion()
      .then(async (latestVersion) => {
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
      })
      .catch((error) => {
        showFailureToast(error, { title: "Failed to load latest version" });
      });
  }, []);
  return version;
};

export const loadSvg = async ({ version, icon, slug }: { version: string; icon: IconData; slug: string }) => {
  const svgPath = path.join(environment.assetsPath, "pack", version, "icons", `${slug}.svg`);
  let svg = await fs.readFile(svgPath, "utf8");
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

export const cleanAssetPack = async () => {
  const directories = await fs.readdir(environment.assetsPath);
  await Promise.all(
    directories
      .filter((d) => d.startsWith("pack"))
      .map((d) => fs.rm(path.join(environment.assetsPath, d), { recursive: true, force: true })),
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
  try {
    const { svg, path: savedPath, withBrandColor } = await loadSvg({ version, icon, slug });
    const tmpPath = path.join(os.tmpdir(), `${slug}.svg`);
    if (withBrandColor) {
      await fs.writeFile(tmpPath, svg, "utf8");
    } else {
      await fs.copyFile(savedPath, tmpPath);
    }
    return tmpPath;
  } catch (error) {
    showFailureToast(error, { title: "Failed to copy file" });
  }
};

export const getAliases = (icon: IconData) => {
  const aka = icon.aliases?.aka ?? [];
  const dup = icon.aliases?.dup?.map((d) => [d.title, ...Object.values(d.loc ?? {})]).flat() ?? [];
  const loc = Object.values(icon.aliases?.loc ?? {});
  return [...new Set([...aka, ...dup, ...loc])];
};

export const getRelativeFileLink = (slug: string, version: string) => `pack/${version}/icons/${slug}.svg`;

export const getAbsoluteFileLink = (slug: string, version: string) =>
  path.join(environment.assetsPath, getRelativeFileLink(slug, version));

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

export const launchSocialBadge = async (icon: IconData, version: string) => {
  try {
    await crossLaunchCommand(
      {
        name: "createSocialBadge",
        type: LaunchType.UserInitiated,
        extensionName: "badges",
        ownerOrAuthorName: "litomore",
        context: {
          launchFromExtensionName: "simple-icons",
          icon: { ...icon, file: getAbsoluteFileLink(icon.slug, version) },
        },
      },
      false,
    );
  } catch {
    const yes = await confirmAlert({
      title: "Badges - shields.io extension not installed",
      message:
        "This feature requires 'Badges - shields.io' extension. Do you want to install the extension from the store?",
    });
    if (yes) {
      await open("raycast://extensions/litomore/badges");
    }
  }
};
