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
// Hard ceiling on staging age: past this the staging is reclaimed even when
// the owner PID answers (PID reuse, or the owner is wedged). Extraction uses
// per-process staging and a rename that loses the race discards its own pack,
// so takeover stays safe.
const assetPackHardStaleMs = 5 * 60_000;
// How long a superseded pack version is kept after the current one landed,
// so a command window that is still open on the old version keeps working.
const assetPackRetentionMs = 24 * 60 * 60_000;

const getAssetPackDestination = (version: string) => path.join(environment.assetsPath, "pack", version);

const hasCompleteAssetPack = async (destination: string) => {
  try {
    await fs.access(path.join(destination, assetPackCompleteMarker), fs.constants.R_OK);
    return true;
  } catch {
    return false;
  }
};

// Icon index of a pack directory. Layout varies across simple-icons releases:
// data/ (current), _data/ (legacy), distribution/icons.json (oldest).
const readAssetPackIcons = async (packPath: string) => {
  const candidates = [
    path.join(packPath, "data", "simple-icons.json"),
    path.join(packPath, "_data", "simple-icons.json"),
    path.join(packPath, "distribution", "icons.json"),
  ];
  const files = await Promise.all(candidates.map((p) => fs.readFile(p, "utf8").catch(() => "")));
  const json = JSON.parse(files.find(Boolean) || "[]");
  return (json.icons ? json.icons : json) as IconData[];
};

// pacote runs node-tar in non-strict mode: an entry that fails to write
// (EPERM from a locked file on Windows, ENOSPC, ...) is logged as a warning
// and skipped, and extract() still resolves. So "extract returned" does not
// mean every icon is on disk. Check the pack against its own index before
// vouching for it with the completion marker; a failure discards the staging
// and the next launch downloads again.
const assertAssetPackComplete = async (packPath: string, version: string) => {
  const icons = await readAssetPackIcons(packPath);
  if (icons.length === 0) throw new Error("Downloaded asset pack contains no icons");
  const present = new Set(await fs.readdir(path.join(packPath, "icons")).catch(() => [] as string[]));
  // Pass the version explicitly: cached-version is not set until the pack is
  // installed, and the slug pattern depends on the pack's major version.
  const missing = icons.filter((icon) => !present.has(`${getIconSlug(icon, version)}.svg`));
  if (missing.length > 0) {
    throw new Error(
      `Downloaded asset pack is incomplete: ${missing.length} of ${icons.length} icons missing (e.g. ${getIconSlug(missing[0], version)}.svg)`,
    );
  }
};

// Best-effort removal of a directory this process owns (its own staging, a
// pack it moved aside, or a superseded version). A failure here — EPERM/EBUSY
// on a locked file on Windows — must never fail a launch: the directory is
// left in place and reclaimDeadStaging sweeps it on a later launch.
const discardDirectory = (directory: string) => fs.rm(directory, { recursive: true, force: true }).catch(() => {});

// Whether a process is still running. Used as the abandonment signal for
// leftover staging: unlike directory mtimes, it stays valid even when writes
// land deep inside extracted subdirectories. EPERM means the process exists
// under another user, which is treated as alive.
const isProcessAlive = (pid: number) => {
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    return (error as NodeJS.ErrnoException).code === "EPERM";
  }
};

// Newest mtime of any file in the tree. pacote streams entries into nested
// directories (icons/...) without touching the staging root's mtime, so the
// root alone makes a long extraction look abandoned.
const newestFileMtimeMs = async (directory: string): Promise<number> => {
  let newest = 0;
  for (const entry of await fs.readdir(directory, { withFileTypes: true })) {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      newest = Math.max(newest, await newestFileMtimeMs(entryPath));
    } else {
      const entryStat = await fs.stat(entryPath).catch(() => null);
      if (entryStat) newest = Math.max(newest, entryStat.mtimeMs);
    }
  }
  return newest;
};

// Reclaim staging directories and stale packs parked aside by a crashed or
// wedged process. A directory is dead when its owner PID is confirmed dead
// past the soft window, or when it has made no progress (newest file mtime
// anywhere in the tree) past the hard ceiling regardless of PID liveness.
const reclaimDeadStaging = async () => {
  const entries = await fs.readdir(environment.assetsPath).catch(() => [] as string[]);
  for (const entry of entries) {
    if (!entry.startsWith(".pack-staging") && !entry.startsWith(".pack-stale")) continue;
    const stagingPath = path.join(environment.assetsPath, entry);
    const stat = await fs.stat(stagingPath).catch(() => null);
    if (!stat) continue;
    // Name format: .pack-staging-<version>-<pid>-<random>
    const segments = entry.split("-");
    const ownerPid = Number(segments[segments.length - 2]);
    const ownerDead = !Number.isInteger(ownerPid) || ownerPid <= 0 || !isProcessAlive(ownerPid);
    const newestMtime = (await newestFileMtimeMs(stagingPath).catch(() => 0)) || stat.mtimeMs;
    const ageMs = Date.now() - newestMtime;
    if ((ownerDead && ageMs > 60_000) || ageMs > assetPackHardStaleMs) {
      // Tolerated so one locked entry doesn't stop the rest of the sweep.
      await discardDirectory(stagingPath);
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
  // files. The atomic rename is the coordination point: the loser discards its
  // own staging and uses the winner's pack.
  const destination = getAssetPackDestination(version);
  const staging = path.join(
    environment.assetsPath,
    `.pack-staging-${version}-${process.pid}-${Math.random().toString(36).slice(2, 8)}`,
  );
  try {
    await pacote.extract(releaseVersion, staging);
    await assertAssetPackComplete(staging, version);
    await fs.writeFile(path.join(staging, assetPackCompleteMarker), version, "utf8");
    await fs.mkdir(path.dirname(destination), { recursive: true });
    try {
      await fs.rename(staging, destination);
    } catch (error) {
      if (await hasCompleteAssetPack(destination)) {
        await discardDirectory(staging);
        return;
      }
      // Destination exists but is incomplete (crashed process, old code).
      // Move it aside with a rename (atomic), then rename staging into the
      // now-free path (atomic). Neither instance can delete a directory it
      // didn't itself move, so this closes the read-then-remove gap.
      // Rename onto a non-empty directory is ENOTEMPTY on macOS/Linux,
      // EEXIST on some filesystems, and EPERM/EACCES on Windows.
      const code = (error as NodeJS.ErrnoException).code;
      if (code === "ENOTEMPTY" || code === "EEXIST" || code === "EPERM" || code === "EACCES") {
        const stale = path.join(
          environment.assetsPath,
          `.pack-stale-${path.basename(destination)}-${process.pid}-${Math.random().toString(36).slice(2, 8)}`,
        );
        let movedAside = true;
        try {
          await fs.rename(destination, stale);
        } catch (moveError) {
          if ((moveError as NodeJS.ErrnoException).code !== "ENOENT") throw moveError;
          // Another instance in this same branch already moved it aside.
          movedAside = false;
        }
        if (movedAside && (await hasCompleteAssetPack(stale))) {
          // The directory we moved aside was completed in the gap by another
          // instance. Restore it and stand down — a marker-bearing directory
          // is never deleted.
          try {
            await fs.rename(stale, destination);
          } catch (restoreError) {
            // The restore failed. If someone else published a complete pack
            // in this gap too, the stale copy is redundant and can go. If the
            // destination is not complete, nothing usable is installed:
            // surface the failure (the outer catch discards staging) rather
            // than report success and let cacheAssetPack persist a version
            // that has no pack. The stale pack is left for reclaimDeadStaging.
            if (!(await hasCompleteAssetPack(destination))) throw restoreError;
            await discardDirectory(stale);
          }
          await discardDirectory(staging);
          return;
        }
        try {
          await fs.rename(staging, destination);
        } catch (renameError) {
          if (await hasCompleteAssetPack(destination)) {
            // Someone else published a complete pack; use it.
            await discardDirectory(staging);
          } else {
            throw renameError;
          }
        }
        if (movedAside) await discardDirectory(stale);
        return;
      }
      throw error;
    }
  } catch (error) {
    // Don't let a failed staging removal mask the original error.
    await discardDirectory(staging);
    throw error;
  }
};

// Age of a pack directory: its marker mtime (when it was published), falling
// back to the directory mtime for marker-less legacy packs.
const assetPackAgeMs = async (packPath: string) => {
  const stat =
    (await fs.stat(path.join(packPath, assetPackCompleteMarker)).catch(() => null)) ??
    (await fs.stat(packPath).catch(() => null));
  return stat ? Date.now() - stat.mtimeMs : 0;
};

// Remove packs of other versions so they don't accumulate (~16 MB each).
// A command that launched on an older version keeps reading it for as long
// as its window stays open, so a superseded pack is only removed once the
// current pack has been in place for the retention period (no new window
// can still start on the old version) and the old pack itself is older than
// the retention period (it wasn't just installed by a peer pinned to it).
// Each removal renames the pack aside first so this process only ever
// deletes a directory it owns: a concurrent publish of the same version
// renames into the freed path instead of into the tree being deleted, and a
// pack that turns out to have been republished in the gap is put back.
const removeSupersededPacks = async (currentVersion: string) => {
  const currentPack = getAssetPackDestination(currentVersion);
  const packRoot = path.dirname(currentPack);
  if ((await assetPackAgeMs(currentPack)) < assetPackRetentionMs) return;
  for (const entry of await fs.readdir(packRoot).catch(() => [] as string[])) {
    // Compare directory names, not the version string: a scoped package name
    // (`@scope/pkg@1.0.0`) nests one level deeper than its version string.
    if (entry === path.basename(currentPack)) continue;
    const packPath = path.join(packRoot, entry);
    if ((await assetPackAgeMs(packPath)) < assetPackRetentionMs) continue;
    const stale = path.join(
      environment.assetsPath,
      `.pack-stale-${entry}-${process.pid}-${Math.random().toString(36).slice(2, 8)}`,
    );
    try {
      await fs.rename(packPath, stale);
    } catch {
      // Already gone, or being swapped by another instance. Leave it to them.
      continue;
    }
    if ((await assetPackAgeMs(stale)) < assetPackRetentionMs) {
      // A peer republished this version between the age check and the move.
      // Restore it; if that fails, reclaimDeadStaging sweeps the parked copy.
      await fs.rename(stale, packPath).catch(() => {});
      continue;
    }
    await discardDirectory(stale);
  }
};

export const cacheAssetPack = async (version: string) => {
  const destination = getAssetPackDestination(version);
  // Sweep before the early return: a crash between the two renames leaves a
  // .pack-stale-* directory that would otherwise never be reclaimed while
  // the destination stays complete. Non-fatal: a sweep failure must neither
  // block the re-download of an incomplete pack nor fail a launch whose pack
  // is fine.
  await reclaimDeadStaging().catch(() => {});
  if (!(await hasCompleteAssetPack(destination))) await pacoteAssetPack(version);
  // Persist on both paths: the pack may already have been installed by another
  // instance, and a launch that skips the download still needs the version to
  // start offline next time.
  cache.set("cached-version", version);
  // Best effort: a cleanup hiccup must not fail a launch whose pack is fine.
  await removeSupersededPacks(version).catch(() => {});
};

export const loadCachedJson = async (version: string) => {
  const icons = await readAssetPackIcons(getAssetPackDestination(version));
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
