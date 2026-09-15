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
// Gate for lock membership changes. Filling a vacancy, replacing a stale
// owner, and releasing all happen while holding it, so those transitions are
// serialized across processes.
const assetPackLockTakeoverName = ".pack-lock.takeover";
// The lock is created once and never unlinked afterwards. Its content is the
// holder's token, or this mark when the lock is free.
const assetPackLockVacantToken = "-";
const assetPackLockStaleMs = 60_000;
// Hard ceiling on heartbeat silence: past this age the lock is reclaimed even
// when the owner PID answers. A dead owner's PID can have been recycled for an
// unrelated process, and gating purely on PID liveness would block recovery
// forever. Five minutes of missed 10s heartbeats means the original owner is
// not functioning; takeover stays safe because extraction uses per-process
// staging and a rename that loses the race discards its own pack.
const assetPackLockHardStaleMs = 5 * 60_000;
// The gate is held only across a lock membership change (a few filesystem
// operations), so its stale thresholds are short. The hard tier bounds a
// holder that is alive but suspended.
const assetPackGateStaleMs = 30_000;

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

// Whether the gate (or any token-carrying lock file) has been abandoned past
// its soft threshold: the holder PID must be dead in the soft..hard window,
// while the hard ceiling reclaims regardless of PID liveness.
const isAssetPackGateStale = async (gatePath: string) => {
  try {
    const stat = await fs.stat(gatePath);
    const ageMs = Date.now() - stat.mtimeMs;
    if (ageMs > assetPackLockHardStaleMs) return true;
    if (ageMs <= assetPackGateStaleMs) return false;
    const pid = parseOwnerPid(await fs.readFile(gatePath, "utf8").catch(() => ""));
    return pid === undefined || !isProcessAlive(pid);
  } catch {
    return false;
  }
};

// Acquire the single gate that guards every lock membership change. A stale
// gate (holder crashed or is suspended past the hard ceiling) is reclaimed.
const holdAssetPackGate = async (gatePath: string, token: string) => {
  for (;;) {
    try {
      await fs.writeFile(gatePath, token, { flag: "wx" });
      return;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error;
      if (await isAssetPackGateStale(gatePath)) {
        await fs.rm(gatePath, { force: true });
        continue;
      }
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
  }
};

// Release the gate only while it still carries this process's token. A process
// whose gate was reclaimed during a hard-tier pause leaves the successor's
// gate in place.
const dropAssetPackGate = async (gatePath: string, token: string) => {
  try {
    const file = await fs.open(gatePath, "r+");
    try {
      if ((await file.readFile("utf8")) === token) {
        await fs.rm(gatePath, { force: true });
      }
    } finally {
      await file.close();
    }
  } catch {
    // The gate vanished (reclaimed after a hard-tier pause); nothing to drop.
  }
};

// Inode-checked compare-and-set on the persistent lock content. The expected
// predecessor token AND an unchanged inode are verified before writing, and
// the new content AND inode after writing. A process paused anywhere past its
// final identity check therefore fails this transition instead of overwriting
// a lock that was unlinked and recreated (new inode) or rewritten (new token)
// by another owner. Reads go through the path so the r+ handle stays at
// offset 0 for the truncate/write.
const compareAndSetAssetPackLock = async (lockPath: string, expected: string, next: string) => {
  let file: Awaited<ReturnType<typeof fs.open>> | undefined;
  try {
    file = await fs.open(lockPath, "r+");
  } catch {
    return false;
  }
  try {
    const fdStat = await file.stat();
    const pathStat = await fs.stat(lockPath).catch(() => null);
    const current = await fs.readFile(lockPath, "utf8").catch(() => "");
    if (!pathStat || fdStat.ino !== pathStat.ino || current !== expected) return false;
    await file.truncate(0);
    await file.writeFile(next, "utf8");
    await file.utimes(new Date(), new Date());
    const afterStat = await fs.stat(lockPath).catch(() => null);
    const after = await fs.readFile(lockPath, "utf8").catch(() => "");
    return afterStat !== null && afterStat.ino === fdStat.ino && after === next;
  } finally {
    await file.close();
  }
};

// Cross-process mutual exclusion: Raycast runs each command invocation in its
// own Node process, so multiple instances can race the clean/extract/swap
// sequence. The lock file is created exclusively (O_EXCL) and afterwards is
// NEVER unlinked: its content is an owner token while work runs and the vacant
// mark in between holders.
//
// Normal acquisition (vacant -> own token), stale takeover
// (stale token -> own token), and release (own token -> vacant) are all the
// same gated transition: hold the gate, compare-and-set the lock content,
// release the gate. The gate serializes the boundaries, and the CAS re-checks
// the token and the inode right before and right after writing, so a pause
// after the final identity check can never remove or overwrite a newer
// owner's lock — even if a hard-tier pause let another process reclaim the
// gate itself.
//
// assertOwner fences the holder at every shared-state boundary, and a
// heartbeat that finds a foreign token or a vanished lock marks ownership
// lost. A live owner displaced across the hard-stale threshold therefore
// stops touching the cache the moment it resumes, so cleanup and installation
// always have exactly one acting owner.
class AssetPackLockLostError extends Error {}

const withAssetPackLock = async <T>(work: (assertOwner: () => Promise<void>) => Promise<T>) => {
  const lockPath = path.join(environment.assetsPath, assetPackLockName);
  const gatePath = path.join(environment.assetsPath, assetPackLockTakeoverName);
  const token = `${process.pid}:${Date.now()}:${Math.random().toString(36).slice(2)}`;

  for (;;) {
    let acquired = false;
    try {
      // Bootstrap: first holder ever creates the persistent lock.
      await fs.writeFile(lockPath, token, { flag: "wx" });
      acquired = true;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error;
      // Every later membership change goes through the gate. Re-inspect
      // staleness INSIDE it: a fresh heartbeat from the owner during the gate
      // wait flips recoverable to false and aborts this takeover.
      await holdAssetPackGate(gatePath, token);
      try {
        const current = await fs.readFile(lockPath, "utf8").catch(() => "");
        if (current === assetPackLockVacantToken) {
          acquired = await compareAndSetAssetPackLock(lockPath, assetPackLockVacantToken, token);
        } else if ((await inspectAssetPackLock(lockPath)).recoverable) {
          acquired = await compareAndSetAssetPackLock(lockPath, current, token);
        }
      } finally {
        await dropAssetPackGate(gatePath, token);
      }
    }
    if (acquired) break;
    // Live owner, lost gate race, or a CAS that failed after a pause: wait as
    // a contender and re-enter acquisition.
    await new Promise((resolve) => setTimeout(resolve, 250));
  }

  // Ownership acquired. Set up fencing, heartbeat, and release.
  let ownershipLost = false;
  const assertOwner = async () => {
    if (ownershipLost) throw new AssetPackLockLostError();
    // A missing lock reads as the vacant mark: this process no longer owns it
    // under any circumstances.
    const current = await fs.readFile(lockPath, "utf8").catch(() => assetPackLockVacantToken);
    if (current !== token) {
      ownershipLost = true;
      throw new AssetPackLockLostError();
    }
  };
  // Refreshes are owner-guarded: opening with "r+" requires the persistent
  // lock to exist and the token is verified before touching it (a holder whose
  // lock was taken over after a stale period can never overwrite the new
  // owner). A foreign token or a vanished lock flips ownershipLost so the
  // fenced work stands down. Writes are chained and awaited on release so none
  // land after ownership ends.
  let heartbeatChain: Promise<void> = Promise.resolve();
  const refreshLock = async () => {
    let file: Awaited<ReturnType<typeof fs.open>> | undefined;
    try {
      file = await fs.open(lockPath, "r+");
      const current = (await file.readFile("utf8")) ?? "";
      if (current === token) {
        // Touch mtime without rewriting content: a content rewrite on an open
        // handle keeps its offset and could pad/truncate the token.
        await file.utimes(new Date(), new Date());
      } else {
        ownershipLost = true;
      }
    } catch (error) {
      // The persistent lock vanished (removed out from under us) or was
      // replaced: an r+ open can never recreate ownership.
      if ((error as NodeJS.ErrnoException).code === "ENOENT") ownershipLost = true;
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
    // Release is the same gated compare-and-set as acquisition. The token can
    // only pass to vacant while this process holds the gate, so a successor
    // cannot transfer in between reading our token and rewriting the lock; the
    // inode check makes a hard-tier pause harmless as well.
    try {
      await holdAssetPackGate(gatePath, token);
      try {
        const current = await fs.readFile(lockPath, "utf8").catch(() => "");
        if (current === token) {
          await compareAndSetAssetPackLock(lockPath, token, assetPackLockVacantToken);
        }
      } finally {
        await dropAssetPackGate(gatePath, token);
      }
    } catch {
      // If the gate cannot be taken, ownership was already reclaimed elsewhere;
      // leave that owner's state untouched.
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
// sooner than the hard timeout), is vacant, or has vanished, so the caller can
// compete again instead of idling through the whole timeout.
const waitForAssetPack = async (destination: string, lockPath: string, timeoutMs: number) => {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (await hasCompleteAssetPack(destination)) return true;
    const inspection = await inspectAssetPackLock(lockPath).catch(() => ({ recoverable: false as const }));
    if (inspection.recoverable) return false;
    const current = await fs.readFile(lockPath, "utf8").catch(() => "");
    if (current === "" || current === assetPackLockVacantToken) return false;
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
