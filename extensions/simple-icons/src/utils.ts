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
const assetPackLockTakeoverName = ".pack-lock.takeover";
const assetPackLockStaleMs = 60_000;
// Hard ceiling on heartbeat silence: past this age the lock is reclaimed even
// when the owner PID answers. A dead owner's PID can have been recycled for an
// unrelated process, and gating purely on PID liveness would block recovery
// forever. Five minutes of missed 10s heartbeats means the original owner is
// not functioning; takeover stays safe because extraction uses per-process
// staging and a rename that loses the race discards its own pack.
const assetPackLockHardStaleMs = 5 * 60_000;

const getAssetPackDestination = (version: string) => path.join(environment.assetsPath, "pack", version);

const hasCompleteAssetPack = async (destination: string) => {
  try {
    await fs.access(path.join(destination, assetPackCompleteMarker), fs.constants.R_OK);
    return true;
  } catch {
    return false;
  }
};

// Whether a process is still running. Used as the abandonment signal for
// stale locks and leftover staging: unlike directory mtimes, it stays valid
// even when writes land deep inside extracted subdirectories. EPERM means the
// process exists under another user, which is treated as alive.
const isProcessAlive = (pid: number) => {
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    return (error as NodeJS.ErrnoException).code === "EPERM";
  }
};

const parseOwnerPid = (token: string) => {
  const pid = Number(token.split(":")[0]);
  return Number.isInteger(pid) && pid > 0 ? pid : undefined;
};

// A lock is recoverable when its heartbeat is stale in two tiers:
//   1. past soft-stale AND the owner process is confirmed dead (normal crash
//      recovery — a live but silent holder keeps the lock), or
//   2. past hard-stale regardless of PID liveness (the owner PID was recycled
//      by an unrelated process, or the owner is wedged — bounds the wait so
//      cacheAssetPack can never block forever).
const inspectAssetPackLock = async (lockPath: string) => {
  try {
    const [{ mtimeMs }, token] = await Promise.all([fs.stat(lockPath), fs.readFile(lockPath, "utf8").catch(() => "")]);
    const ageMs = Date.now() - mtimeMs;
    if (ageMs <= assetPackLockStaleMs) return { recoverable: false as const };
    if (ageMs > assetPackLockHardStaleMs) return { recoverable: true as const };
    const pid = parseOwnerPid(token);
    if (pid === undefined || isProcessAlive(pid)) return { recoverable: false as const };
    return { recoverable: true as const };
  } catch {
    return { recoverable: false as const };
  }
};

// Cross-process mutual exclusion: Raycast runs each command invocation in its
// own Node process, so multiple instances can race the clean/extract/swap
// sequence. The lock file is created exclusively (O_EXCL) and carries a
// random owner token; a heartbeat keeps its mtime fresh while the holder is
// working.
//
// Recovery from a dead holder never unlinks the lock path: a vacated path can
// be acquired by a third process between removal and the successor's
// re-creation. Instead, contenders elect one successor through a marker
// created with O_EXCL, and the winner rewrites the lock contents in place so
// an exclusive owner exists at every instant.
//
// The election winner only takes over after re-reading the lock and matching
// the stale token it observed: another successor may have completed a whole
// transfer (removing its election marker) while this process was paused.
//
// assertOwner is handed to the locked work: the holder fences itself at every
// shared-state boundary, and a heartbeat that finds a foreign token marks the
// lock lost. A live owner that was paused past the hard-stale threshold and
// succeeded therefore stops touching the cache the moment it resumes, so
// cleanup and installation always have exactly one acting owner.
class AssetPackLockLostError extends Error {}

const withAssetPackLock = async <T>(work: (assertOwner: () => Promise<void>) => Promise<T>) => {
  const lockPath = path.join(environment.assetsPath, assetPackLockName);
  const takeoverPath = path.join(environment.assetsPath, assetPackLockTakeoverName);
  const token = `${process.pid}:${Date.now()}:${Math.random().toString(36).slice(2)}`;

  const transferStaleLock = async (staleToken: string) => {
    // Electing a single successor: exactly one contender's O_EXCL create
    // succeeds; losers wait while the elected owner is alive.
    try {
      await fs.writeFile(takeoverPath, token, { flag: "wx" });
    } catch (createError) {
      if ((createError as NodeJS.ErrnoException).code !== "EEXIST") throw createError;
      // A takeover is already in progress. Reclaim the marker only when its
      // owner is dead; a live successor may be about to transfer the lock.
      if ((await inspectAssetPackLock(takeoverPath)).recoverable) {
        await fs.rm(takeoverPath, { force: true });
      }
      return false;
    }
    try {
      // Revalidate before writing: the staleness observation happened before
      // the election, and a paused process can reach this point after another
      // successor already replaced the stale token and removed its marker.
      const currentToken = await fs.readFile(lockPath, "utf8").catch(() => "");
      if (currentToken !== staleToken || !(await inspectAssetPackLock(lockPath)).recoverable) {
        await fs.rm(takeoverPath, { force: true }).catch(() => {});
        return false;
      }
      // In-place transfer: the lock path is never unlinked, so no third
      // process can acquire it during recovery, and holding the election
      // marker means no other successor can be rewriting the lock.
      const file = await fs.open(lockPath, "r+");
      try {
        await file.truncate(0);
        await file.writeFile(token, "utf8");
        await file.utimes(new Date(), new Date());
      } finally {
        await file.close();
      }
    } catch (transferError) {
      await fs.rm(takeoverPath, { force: true }).catch(() => {});
      throw transferError;
    }
    await fs.rm(takeoverPath, { force: true }).catch(() => {});
    return true;
  };

  for (;;) {
    try {
      await fs.writeFile(lockPath, token, { flag: "wx" });
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error;
      const inspection = await inspectAssetPackLock(lockPath);
      const staleToken = await fs.readFile(lockPath, "utf8").catch(() => "");
      const transferred = inspection.recoverable && (await transferStaleLock(staleToken));
      if (!transferred) {
        // Wait while a live holder keeps the heartbeat fresh or a successor
        // election is in progress; no acquisition timeout.
        await new Promise((resolve) => setTimeout(resolve, 250));
        continue;
      }
    }
    let ownershipLost = false;
    const assertOwner = async () => {
      if (ownershipLost) throw new AssetPackLockLostError();
      const current = await fs.readFile(lockPath, "utf8").catch(() => "");
      if (current !== token) {
        ownershipLost = true;
        throw new AssetPackLockLostError();
      }
    };
    // Refreshes are owner-guarded: opening with "r+" requires the lock to
    // exist and the token is verified before touching it (a holder whose lock
    // was taken over after a stale period can never overwrite the new owner).
    // A foreign token flips ownershipLost so the fenced work stands down.
    // Writes are chained and awaited on release so none land after the lock
    // is removed.
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
        } else {
          ownershipLost = true;
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
      return await work(assertOwner);
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
  }
};

const pacoteAssetPack = async (version: string, assertOwner: () => Promise<void>) => {
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
    // A download spanning the hard-stale threshold may have allowed a
    // successor to take over while this process was paused. Only the current
    // owner may move a pack into the destination.
    await assertOwner();
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
    // Re-raise displacement: the successor owns the destination. If the
    // staging was reclaimed mid-pause this also converts the resulting ENOENT
    // into lock loss once ownership is gone.
    await assertOwner();
    throw error;
  }
};

// Wait for another holder to finish installing. Returns as soon as the pack
// is complete, or earlier when the holder's lock becomes recoverable (a
// crashed successor's lock is reclaimable after the soft-stale threshold, far
// sooner than the hard timeout) or disappears, so the caller can compete
// again instead of idling through the whole timeout.
const waitForAssetPack = async (destination: string, lockPath: string, timeoutMs: number) => {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (await hasCompleteAssetPack(destination)) return true;
    const inspection = await inspectAssetPackLock(lockPath).catch(() => ({ recoverable: false as const }));
    if (inspection.recoverable) return false;
    const lockMissing = await fs
      .access(lockPath)
      .then(() => false)
      .catch(() => true);
    if (lockMissing) return false;
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  return hasCompleteAssetPack(destination);
};

export const cacheAssetPack = async (version: string) => {
  const destination = getAssetPackDestination(version);
  const lockPath = path.join(environment.assetsPath, assetPackLockName);
  for (;;) {
    if (await hasCompleteAssetPack(destination)) return;
    try {
      await withAssetPackLock(async (assertOwner) => {
        // Another instance may have completed the pack while we waited for the lock.
        if (await hasCompleteAssetPack(destination)) return;
        await assertOwner();
        cache.set("cached-version", "");
        await cleanAssetPack(assertOwner);
        await assertOwner();
        await pacoteAssetPack(version, assertOwner);
        await assertOwner();
        cache.set("cached-version", version);
      });
    } catch (error) {
      // A successor took over; fall through to waiting for its pack.
      if (!(error instanceof AssetPackLockLostError)) throw error;
    }
    if (await waitForAssetPack(destination, lockPath, assetPackLockHardStaleMs)) return;
    // No completed pack within the hard-stale window: the successor stalled or
    // died. Re-enter acquisition — wait as a contender or take over its lock.
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

// Newest mtime of any file beneath a directory. The staging root's own mtime
// is not refreshed by writes inside extracted subdirectories (e.g. icons/),
// but the written files' mtimes are. This bounds reclamation when the owner
// PID answers (possible PID reuse) without trusting directory age.
const newestFileMtimeMs = async (directory: string): Promise<number> => {
  let newest = 0;
  for (const entry of await fs.readdir(directory, { withFileTypes: true })) {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      newest = Math.max(newest, await newestFileMtimeMs(entryPath));
    } else {
      newest = Math.max(newest, (await fs.stat(entryPath)).mtimeMs);
    }
  }
  return newest;
};

const cleanAssetPack = async (assertOwner: () => Promise<void>) => {
  await assertOwner();
  const directories = await fs.readdir(environment.assetsPath);
  for (const d of directories) {
    const directoryPath = path.join(environment.assetsPath, d);
    if (d === "pack") {
      // Remove one version directory at a time, re-checking ownership
      // between each: a paused holder that lost the lock must not resume into
      // deleting the successor's freshly installed pack.
      const versions = await fs.readdir(directoryPath).catch(() => [] as string[]);
      for (const v of versions) {
        await assertOwner();
        await fs.rm(path.join(directoryPath, v), { recursive: true, force: true });
      }
    } else if (d.startsWith("pack")) {
      await assertOwner();
      await fs.rm(directoryPath, { recursive: true, force: true });
    } else if (d.startsWith(".pack-staging")) {
      // Prefer PID liveness; when the PID answers but no file beneath the
      // staging tree has been written within the hard-stale window, the PID
      // was recycled (or the owner wedged) and the staging is abandoned.
      const segments = d.split("-");
      const ownerPid = Number(segments[segments.length - 2]);
      const ownerDead = !Number.isInteger(ownerPid) || ownerPid <= 0 || !isProcessAlive(ownerPid);
      const contentStale =
        Date.now() - (await newestFileMtimeMs(directoryPath).catch(() => 0)) > assetPackLockHardStaleMs;
      if (ownerDead || contentStale) {
        await assertOwner();
        await fs.rm(directoryPath, { recursive: true, force: true });
      }
    }
  }
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
