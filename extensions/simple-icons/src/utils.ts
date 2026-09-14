import { useEffect, useMemo, useState } from "react";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import process from "node:process";
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
export const raycastProtocol = process.env.RAYCAST_SCHEME ?? "raycast";

export const {
  defaultDetailAction = "OpenWith",
  defaultLoadSvgAction = "WithBrandColor",
  displaySimpleIconsFontFeatures,
  enableAiSearch,
  githubToken,
  releaseVersion,
  shuffleOnStart,
  usePasteInsteadOfCopy,
} = getPreferenceValues<ExtensionPreferences>();

export const hasAccessToAi = environment.canAccess(AI);

export const copyOrPaste = async (content: string | number | Clipboard.Content) => {
  if (usePasteInsteadOfCopy) {
    Clipboard.paste(content);
  } else {
    Clipboard.copy(content);
    await showHUD("Copied to Clipboard");
  }
};

export const buildDeeplinkParameters = (launchContext?: LaunchContext) => {
  if (!launchContext) return "";
  return "?context=" + encodeURIComponent(JSON.stringify(launchContext));
};

const assetPackCompleteMarker = ".raycast-complete";
const assetPackLockName = ".pack-lock";
const assetPackLockStaleMs = 60_000;

const getAssetPackDestination = (version: string) => path.join(environment.assetsPath, "pack", version);

const hasCompleteAssetPack = async (destination: string) => {
  try {
    await fs.access(path.join(destination, assetPackCompleteMarker), fs.constants.R_OK);
    return true;
  } catch {
    return false;
  }
};

// Cross-process mutual exclusion: Raycast runs each command invocation in its
// own Node process, so multiple instances can race the clean/extract/swap
// sequence. The lock file is created exclusively (O_EXCL) and carries a random
// owner token; a heartbeat keeps its mtime fresh while the holder is working, so
// a crashed holder is safely taken over after the stale interval.
// Atomically claim the right to replace a stale lock. Two waiters can
// observe the same stale lock concurrently, so an unconditional removal
// would let one waiter delete the other's freshly acquired lock. Instead
// the lock is renamed aside (rename(2) succeeds for one contender) and its
// owner token is compared with the one observed as stale: only a match
// grants takeover. If a fresh owner had already replaced the lock, its file
// is moved back and the caller stands down.
const claimStaleAssetPackLock = async (lockPath: string, staleToken: string) => {
  const aside = path.join(
    path.dirname(lockPath),
    `${path.basename(lockPath)}.stale-${process.pid}-${Math.random().toString(36).slice(2, 8)}`,
  );
  try {
    await fs.rename(lockPath, aside);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return false;
    throw error;
  }
  const movedToken = await fs.readFile(aside, "utf8").catch(() => "");
  if (movedToken && movedToken === staleToken) {
    await fs.rm(aside, { force: true });
    return true;
  }
  try {
    await fs.rename(aside, lockPath);
  } catch (restoreError) {
    const code = (restoreError as NodeJS.ErrnoException).code;
    if (code !== "EEXIST" && code !== "ENOENT") throw restoreError;
    await fs.rm(aside, { force: true }).catch(() => {});
  }
  return false;
};

const withAssetPackLock = async <T>(work: () => Promise<T>) => {
  const lockPath = path.join(environment.assetsPath, assetPackLockName);
  const token = `${process.pid}:${Date.now()}:${Math.random().toString(36).slice(2)}`;
  for (;;) {
    try {
      await fs.writeFile(lockPath, token, { flag: "wx" });
      // Refreshes are owner-guarded: opening with "r+" requires the lock to
      // exist (it can never recreate a deleted lock) and the token is verified
      // before writing (a holder whose lock was taken over after a stale period
      // can never overwrite the new owner). Writes are chained and awaited on
      // release so none can land after the lock is removed.
      let heartbeatChain: Promise<void> = Promise.resolve();
      const refreshLock = async () => {
        let file: Awaited<ReturnType<typeof fs.open>> | undefined;
        try {
          file = await fs.open(lockPath, "r+");
          const current = (await file.readFile("utf8")) ?? "";
          if (current === token) {
            // Touch mtime without rewriting content: a content rewrite on an
            // open handle keeps its offset and could pad/truncate the token.
            await file.utimes(new Date(), new Date());
          }
        } catch {
          // The lock is gone or was taken over; stop maintaining it.
        } finally {
          await file?.close();
        }
      };
      const heartbeat = setInterval(() => {
        heartbeatChain = heartbeatChain.then(refreshLock, refreshLock);
      }, 10_000);
      try {
        return await work();
      } finally {
        clearInterval(heartbeat);
        await heartbeatChain;
        try {
          if ((await fs.readFile(lockPath, "utf8").catch(() => "")) === token) {
            await fs.rm(lockPath, { force: true });
          }
        } catch {
          // Another holder may have taken over a stale lock; only remove our own.
        }
      }
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error;
      // No acquisition timeout: wait as long as a live holder keeps the
      // heartbeat fresh. A dead holder is detected via the stale mtime below.
      try {
        const { mtimeMs } = await fs.stat(lockPath);
        if (Date.now() - mtimeMs > assetPackLockStaleMs) {
          // Read the stale owner token first: claimStaleAssetPackLock only
          // completes the takeover if the file it moves still carries this
          // exact token, so concurrent stale observers cannot remove a lock
          // that another contender has already re-acquired.
          const staleToken = await fs.readFile(lockPath, "utf8").catch(() => "");
          if (staleToken && (await claimStaleAssetPackLock(lockPath, staleToken))) {
            continue;
          }
        }
      } catch {
        // The lock disappeared (or was replaced); retry acquiring it.
      }
      await new Promise((resolve) => setTimeout(resolve, 250));
    }
  }
};

const pacoteAssetPack = async (version: string) => {
  await showToast({
    style: Toast.Style.Animated,
    title: "Downloading asset pack",
  });
  // Extract into an instance-owned staging directory and swap it in only once
  // the marker is written, so other instances never observe half-extracted
  // files. This runs under withAssetPackLock; staging isolation additionally
  // protects the destination if the process is killed mid-download.
  const destination = getAssetPackDestination(version);
  const staging = path.join(
    environment.assetsPath,
    `.pack-staging-${version}-${process.pid}-${Math.random().toString(36).slice(2, 8)}`,
  );
  try {
    await pacote.extract(releaseVersion, staging);
    await fs.writeFile(path.join(staging, assetPackCompleteMarker), version, "utf8");
    await fs.mkdir(path.dirname(destination), { recursive: true });
    try {
      await fs.rename(staging, destination);
    } catch (error) {
      if (await hasCompleteAssetPack(destination)) {
        await fs.rm(staging, { recursive: true, force: true });
        return;
      }
      throw error;
    }
  } catch (error) {
    await fs.rm(staging, { recursive: true, force: true });
    throw error;
  }
};

export const cacheAssetPack = async (version: string) => {
  const destination = getAssetPackDestination(version);
  if (await hasCompleteAssetPack(destination)) return;
  await withAssetPackLock(async () => {
    // Another instance may have completed the pack while we waited for the lock.
    if (await hasCompleteAssetPack(destination)) return;
    cache.set("cached-version", "");
    await cleanAssetPack();
    await pacoteAssetPack(version);
    cache.set("cached-version", version);
  });
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
              open(
                `${raycastProtocol}://extensions/litomore/simple-icons/index` + buildDeeplinkParameters(launchContext),
              );
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
  copyOrPaste(svg);
};

export const cleanAssetPack = async () => {
  const directories = await fs.readdir(environment.assetsPath);
  await Promise.all(
    directories.map(async (d) => {
      if (d.startsWith("pack")) {
        await fs.rm(path.join(environment.assetsPath, d), { recursive: true, force: true });
      } else if (d.startsWith(".pack-staging")) {
        // Only remove staging directories abandoned before the stale
        // threshold: an install still in progress keeps adding files, so a
        // fresh mtime means this must never be swept as leftover.
        try {
          const { mtimeMs } = await fs.stat(path.join(environment.assetsPath, d));
          if (Date.now() - mtimeMs > assetPackLockStaleMs) {
            await fs.rm(path.join(environment.assetsPath, d), { recursive: true, force: true });
          }
        } catch {
          // It vanished between readdir and stat; nothing to remove.
        }
      }
    }),
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
  const { data, isLoading: aiIsLoading } = useAI(searchPrompt, { execute });
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
      await open(`${raycastProtocol}://extensions/litomore/badges`);
    }
  }
};
