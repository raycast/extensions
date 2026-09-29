import fs from "node:fs";
import {
  Clipboard,
  LocalStorage,
  Toast,
  confirmAlert,
  environment,
  getPreferenceValues,
  showToast,
} from "@raycast/api";
import { getDenoPath, getGalleryDlPath, getMonolithPath, getSpotdlPath, getffmpegPath, getytdlPath } from "../utils.js";
import { TOOL_INFO, ToolId, toolInfoFor } from "./tools.js";
import { checkOutdated, errorMessageOf, upgrade } from "./package-manager.js";
import {
  CHECK_BUDGET_MS,
  PendingUpdate,
  SNOOZE_MS,
  describeUpdate,
  getToolVersion,
  isPackageManagerInstall,
  isSnoozed,
  packageFor,
  pendingUpdates,
  readCachedLatest,
  serializeLatest,
  singleFlight,
  toolsToCheck,
  withTimeout,
} from "./tool-freshness.js";

const CACHE_KEY = "tool-update-check";
const snoozeKey = (tool: ToolId) => `tool-update-snoozed-until:${tool}`;

const TOOL_PATH: Record<ToolId, () => string> = {
  "yt-dlp": getytdlPath,
  ffmpeg: getffmpegPath,
  deno: getDenoPath,
  "gallery-dl": getGalleryDlPath,
  monolith: getMonolithPath,
  spotdl: getSpotdlPath,
};

export type ToolUpdateOutcome = "current" | "updated" | "declined" | "unmanaged" | "failed";

const nameOf = (tool: ToolId) => TOOL_INFO[tool].name;

function listNames(updates: PendingUpdate[]): string {
  const names = updates.map((u) => nameOf(u.tool));
  return names.length <= 2 ? names.join(" and ") : `${names.slice(0, -1).join(", ")} and ${names.at(-1)}`;
}

function realPathOf(binaryPath: string): string {
  try {
    return fs.realpathSync(binaryPath);
  } catch {
    return binaryPath;
  }
}

/** True when the extension can upgrade the binary it runs: a Homebrew/winget install, or its own spotDL download. */
function isUpgradable(tool: ToolId): boolean {
  const binary = TOOL_PATH[tool]();
  if (tool === "spotdl") return binary.startsWith(environment.supportPath);
  return isPackageManagerInstall(realPathOf(binary), process.platform);
}

const checksEnabled = () => getPreferenceValues<ExtensionPreferences>().checkToolUpdates !== false;

/** Forget the cached package-manager check, e.g. after an upgrade. */
export async function clearToolCheckCache(): Promise<void> {
  await LocalStorage.removeItem(CACHE_KEY);
}

/** Newest versions of every outdated tool, keyed by tool — from the cache, or a fresh package-manager check. */
async function latestVersions(): Promise<Partial<Record<ToolId, string>>> {
  const cached = readCachedLatest(await LocalStorage.getItem<string>(CACHE_KEY), Date.now());
  return cached ?? freshLatestVersions();
}

/**
 * Run the package-manager check and cache a clean result. Single-flight: a
 * check that outlived a download's time budget keeps running, and the next
 * download joins it instead of starting a second brew/winget process.
 */
const freshLatestVersions = singleFlight(async (): Promise<Partial<Record<ToolId, string>>> => {
  const now = Date.now();
  const { outdated, issues } = await checkOutdated();
  const latest: Partial<Record<ToolId, string>> = {};
  for (const tool of Object.keys(TOOL_PATH) as ToolId[]) {
    const version = outdated[packageFor(tool, process.platform)];
    if (version) latest[tool] = version;
  }
  // A partly failed check could hide real updates for hours, so only a clean one is cached.
  if (issues.length === 0) await LocalStorage.setItem(CACHE_KEY, serializeLatest(latest, now));
  return latest;
});

/** Updates available for the tools behind these executables (e.g. a download's `requiredTools`). */
export async function findPendingUpdates(executables: string[]): Promise<PendingUpdate[]> {
  const tools = toolsToCheck(executables).filter((tool) => fs.existsSync(TOOL_PATH[tool]()));
  if (tools.length === 0) return [];
  const [latest, versions] = await Promise.all([
    latestVersions(),
    Promise.all(tools.map((tool) => getToolVersion(TOOL_PATH[tool](), tool))),
  ]);
  const installed = Object.fromEntries(tools.map((tool, i) => [tool, versions[i]]));
  return pendingUpdates(tools, installed, latest, Date.now());
}

/** Upgrade tools through Homebrew/winget (spotDL: re-download), reporting progress and the result in a toast. */
export async function updateTools(updates: PendingUpdate[]): Promise<"updated" | "failed"> {
  const label = listNames(updates);
  const toast = await showToast({
    style: Toast.Style.Animated,
    title: `Updating ${label}…`,
    message: "Keep Raycast open until it finishes.",
  });
  try {
    const { issues, attempted } = await upgrade(
      Object.fromEntries(updates.map((u) => [packageFor(u.tool, process.platform), u.latest ?? "latest"])),
    );
    await clearToolCheckCache();
    if (issues.length > 0) {
      const message = issues.map((i) => `${toolInfoFor(i.pkg).name}: ${i.message}`).join("\n");
      toast.style = Toast.Style.Failure;
      toast.title = issues.length < attempted ? "Some updates failed" : `Couldn't update ${label}`;
      toast.message = message;
      toast.primaryAction = { title: "Copy Error", onAction: () => Clipboard.copy(message) };
      return issues.length < attempted ? "updated" : "failed";
    }
    const versions = await Promise.all(updates.map((u) => getToolVersion(TOOL_PATH[u.tool](), u.tool)));
    toast.style = Toast.Style.Success;
    toast.title = `Updated ${label}`;
    toast.message = updates.map((u, i) => `${nameOf(u.tool)} ${versions[i] ?? ""}`.trim()).join(" · ");
    return "updated";
  } catch (error) {
    const message = errorMessageOf(error);
    toast.style = Toast.Style.Failure;
    toast.title = `Couldn't update ${label}`;
    toast.message = message;
    toast.primaryAction = { title: "Copy Error", onAction: () => Clipboard.copy(message) };
    return "failed";
  }
}

let prompting = false;

/**
 * Before a download: check the tools behind these executables and, when any is
 * outdated, ask the user to update them — and do so on a yes. "Not Now" (and
 * tools the extension can't upgrade) is remembered per tool for a day. Never
 * throws: a broken check must not block a download.
 */
export async function ensureFreshTools(executables: string[]): Promise<ToolUpdateOutcome> {
  if (prompting || !checksEnabled()) return "current";
  prompting = true;
  try {
    const now = Date.now();
    const pending: PendingUpdate[] = [];
    // A slow or wedged check must not hold up the download: past the budget, start anyway.
    // The check keeps running and caches its result for next time.
    const found = await withTimeout(findPendingUpdates(executables), CHECK_BUDGET_MS, []);
    for (const update of found) {
      if (!isSnoozed(await LocalStorage.getItem<string>(snoozeKey(update.tool)), now)) pending.push(update);
    }
    if (pending.length === 0) return "current";
    const snooze = () =>
      Promise.all(pending.map((u) => LocalStorage.setItem(snoozeKey(u.tool), String(now + SNOOZE_MS))));

    const upgradable = pending.filter((u) => isUpgradable(u.tool));
    const manual = pending.filter((u) => !isUpgradable(u.tool));
    const manualNote = manual.length > 0 ? `Update ${listNames(manual)} yourself, where you installed it.` : "";

    if (upgradable.length === 0) {
      await snooze();
      await showToast({
        style: Toast.Style.Failure,
        title: `${listNames(manual)} ${manual.length === 1 ? "is" : "are"} outdated`,
        message: `${manual.map(describeUpdate).join(", ")}. ${manualNote}`,
      });
      return "unmanaged";
    }

    const confirmed = await confirmAlert({
      title: upgradable.length === 1 ? `Update ${nameOf(upgradable[0].tool)}?` : "Update Tools?",
      message: [
        upgradable.map((u) => `• ${describeUpdate(u)}`).join("\n"),
        "Sites change often, so outdated tools can make downloads fail.",
        manualNote,
      ]
        .filter(Boolean)
        .join("\n\n"),
      primaryAction: { title: "Update" },
      dismissAction: { title: "Not Now" },
    });
    if (!confirmed) {
      await snooze();
      return "declined";
    }
    return await updateTools(upgradable);
  } catch {
    return "failed";
  } finally {
    prompting = false;
  }
}

/**
 * After a download failed: when the tool that ran it is outdated, say so on the
 * failure toast and offer the update. Leaves the toast alone otherwise, and
 * never masks the original failure.
 */
export async function hintOutdatedTool(toast: Toast, executable: string): Promise<void> {
  if (!checksEnabled()) return;
  try {
    const [update] = await withTimeout(findPendingUpdates([executable]), CHECK_BUDGET_MS, []);
    if (!update) return;
    const error = toast.message ?? "";
    const name = nameOf(update.tool);
    toast.message = `${error}\n\n${describeUpdate(update)}: an outdated ${name} is a common cause of failed downloads.`;
    if (isUpgradable(update.tool)) {
      toast.primaryAction = { title: `Update ${name}`, onAction: () => void updateTools([update]) };
      toast.secondaryAction = { title: "Copy Error", onAction: () => Clipboard.copy(error) };
    }
  } catch {
    /* keep the original failure toast */
  }
}
