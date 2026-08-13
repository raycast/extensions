// The only file allowed to import @raycast/api. Commands call through here
// so src/lib/showmd.ts stays plain-node testable.

import { getPreferenceValues, open, showToast, Toast } from "@raycast/api";
import {
  diffSettings,
  errorMessage,
  getManageStatus,
  getSettings,
  listServers,
  openSkillsTarget,
  openTarget,
  putSettings,
  readRecents,
  removeRecent,
  restartServer,
  restartServerAt,
  spawnShowmdLauncher,
  stopAllServers,
  stopServer,
  stopServerAt,
  targetUrlAfterSpawn,
  urlForPort,
  waitForServer,
  type ManageStatus,
  type OpenPlan,
  type RecentEntry,
  type ServerInfo,
  type ShowmdPrefs,
  type ShowmdSettings,
  type SpawnResult,
} from "./showmd";
import { resolveOpenTarget, type TargetKind } from "./target-resolution";

export function getShowmdPrefs(): ShowmdPrefs {
  const prefs = getPreferenceValues<Preferences>();
  return {
    showmdPath: prefs.showmdPath,
    port: prefs.port,
    reuseServer: prefs.reuseServer,
  };
}

export async function openInShowmd(target: string): Promise<void> {
  const prefs = getShowmdPrefs();
  const toast = await showToast({
    style: Toast.Style.Animated,
    title: "Opening in ShowMD…",
  });

  let plan: OpenPlan;
  try {
    plan = await openTarget(target, prefs);
  } catch (err) {
    toast.style = Toast.Style.Failure;
    toast.title = "Could not open ShowMD";
    toast.message = errorMessage(err);
    return;
  }

  if (plan.action === "url") {
    await open(plan.url);
    toast.style = Toast.Style.Success;
    toast.title = "Opened in ShowMD";
    return;
  }

  if (!plan.result.ok) {
    toast.style = Toast.Style.Failure;
    toast.title = /binary not found/i.test(plan.result.error || "")
      ? "ShowMD binary not found"
      : "Could not start ShowMD";
    toast.message =
      plan.result.error ||
      "Set the ShowMD Path preference or install showmd-cli.";
    return;
  }

  toast.title = "Starting ShowMD…";
  const targetResult = await targetUrlAfterSpawn(target, prefs, plan.result);
  if (!targetResult.running) {
    toast.style = Toast.Style.Failure;
    toast.title = "ShowMD did not start in time";
    return;
  }
  if (!targetResult.url) {
    toast.style = Toast.Style.Failure;
    toast.title = "ShowMD could not open the target";
    return;
  }

  await open(targetResult.url);
  toast.style = Toast.Style.Success;
  toast.title = "Opened in ShowMD";
}

// Both browse rows in the Open command open a native dialog. A cancel is a
// silent no-op, never a toast.
export async function openTargetCommand(kind: TargetKind): Promise<void> {
  const result = await resolveOpenTarget(kind);
  if (!result.ok) {
    if (result.canceled) return;
    await showToast({
      style: Toast.Style.Failure,
      title: `Could not open ${kind}`,
      message: result.error,
    });
    return;
  }
  await openInShowmd(result.path);
}

// A spawned process's port must match what it was launched with.
function withSpawnedPort(prefs: ShowmdPrefs, result: SpawnResult): ShowmdPrefs {
  if (!result.port) return prefs;
  return { ...prefs, port: String(result.port) };
}

export async function loadRecents(): Promise<RecentEntry[]> {
  const prefs = getShowmdPrefs();
  return readRecents(prefs);
}

export async function deleteRecent(entryPath: string): Promise<boolean> {
  const prefs = getShowmdPrefs();
  return removeRecent(entryPath, prefs);
}

export async function loadManageStatus(): Promise<ManageStatus> {
  return getManageStatus(getShowmdPrefs());
}

interface ToastFlow<T = void> {
  animatedTitle: string;
  action: () => Promise<{ ok: boolean; error?: string; value?: T }>;
  failTitle: string;
  confirm?: (value: T) => Promise<boolean>;
  successTitle: string;
  timeoutTitle?: string;
}

// Shared shape behind the toast-driven server actions below: show an
// Animated toast, run the action, then optionally confirm it took effect
// (e.g. polling waitForServer) before flipping to Success/Failure.
async function runToastFlow<T = void>(flow: ToastFlow<T>): Promise<boolean> {
  const toast = await showToast({
    style: Toast.Style.Animated,
    title: flow.animatedTitle,
  });
  const result = await flow.action();
  if (!result.ok) {
    toast.style = Toast.Style.Failure;
    toast.title = flow.failTitle;
    if (result.error) toast.message = result.error;
    return false;
  }
  const confirmed = flow.confirm ? await flow.confirm(result.value as T) : true;
  if (confirmed) {
    toast.style = Toast.Style.Success;
    toast.title = flow.successTitle;
    return true;
  }
  toast.style = Toast.Style.Failure;
  toast.title = flow.timeoutTitle ?? flow.failTitle;
  return false;
}

export async function startShowmdServer(): Promise<boolean> {
  const prefs = getShowmdPrefs();
  return runToastFlow<SpawnResult>({
    animatedTitle: "Starting ShowMD…",
    action: async () => {
      const spawned = await spawnShowmdLauncher(prefs);
      return { ok: spawned.ok, error: spawned.error, value: spawned };
    },
    failTitle: "Could not start ShowMD",
    confirm: async (spawned) =>
      (await waitForServer(withSpawnedPort(prefs, spawned))).running,
    successTitle: "ShowMD started",
    timeoutTitle: "ShowMD did not start in time",
  });
}

export async function restartShowmdServer(): Promise<boolean> {
  const prefs = getShowmdPrefs();
  return runToastFlow({
    animatedTitle: "Restarting ShowMD…",
    action: async () => ({ ok: await restartServer(prefs) }),
    failTitle: "Could not restart ShowMD",
    confirm: async () => (await waitForServer(prefs)).running,
    successTitle: "ShowMD restarted",
    timeoutTitle: "ShowMD did not come back up in time",
  });
}

export async function stopShowmdServer(): Promise<boolean> {
  const prefs = getShowmdPrefs();
  return runToastFlow({
    animatedTitle: "Stopping ShowMD…",
    action: async () => ({ ok: await stopServer(prefs) }),
    failTitle: "Could not stop ShowMD",
    confirm: async () =>
      !(await waitForServer(prefs, { want: "stopped" })).running,
    successTitle: "ShowMD stopped",
    timeoutTitle: "ShowMD did not stop in time",
  });
}

// Menu Bar dropdown and Manage Server list act on one instance among
// possibly several, so these poll listServers() for that specific port
// rather than waitForServer()'s single-target "the" server.
async function waitForPortGone(
  port: number,
  prefs: ShowmdPrefs,
): Promise<boolean> {
  const deadline = Date.now() + 10000;
  for (;;) {
    const servers = await listServers(prefs);
    if (!servers.some((s) => s.port === port)) return true;
    if (Date.now() >= deadline) return false;
    await new Promise((r) => setTimeout(r, 500));
  }
}

export async function stopShowmdServerAt(server: ServerInfo): Promise<boolean> {
  const prefs = getShowmdPrefs();
  return runToastFlow({
    animatedTitle: `Stopping ${server.port}…`,
    action: async () => ({ ok: await stopServerAt(server.port) }),
    failTitle: "Could not stop ShowMD",
    confirm: async () => waitForPortGone(server.port, prefs),
    successTitle: "ShowMD stopped",
    timeoutTitle: "ShowMD did not stop in time",
  });
}

export async function restartShowmdServerAt(
  server: ServerInfo,
): Promise<boolean> {
  return runToastFlow({
    animatedTitle: `Restarting ${server.port}…`,
    action: async () => ({ ok: await restartServerAt(server.port) }),
    failTitle: "Could not restart ShowMD",
    successTitle: "ShowMD restarted",
  });
}

export async function stopAllShowmdServers(): Promise<boolean> {
  const prefs = getShowmdPrefs();
  return runToastFlow({
    animatedTitle: "Stopping ShowMD…",
    action: async () => ({ ok: await stopAllServers(prefs) }),
    failTitle: "Could not stop ShowMD",
    successTitle: "ShowMD stopped",
  });
}

export async function loadSettings(): Promise<ShowmdSettings | null> {
  return getSettings(getShowmdPrefs());
}

export async function saveSettings(
  original: ShowmdSettings,
  current: ShowmdSettings,
): Promise<boolean> {
  const changes = diffSettings(original, current);
  if (Object.keys(changes).length === 0) return true;
  return putSettings(getShowmdPrefs(), changes);
}

export async function startServerForSettings(): Promise<boolean> {
  const prefs = getShowmdPrefs();
  const spawned = await spawnShowmdLauncher(prefs);
  if (!spawned.ok) return false;
  const status = await waitForServer(withSpawnedPort(prefs, spawned));
  return status.running;
}

export async function openSkillsBrowser(): Promise<void> {
  const prefs = getShowmdPrefs();
  const toast = await showToast({
    style: Toast.Style.Animated,
    title: "Opening agent skills…",
  });

  const plan = await openSkillsTarget(prefs);
  if (plan.action === "url") {
    await open(plan.url);
    toast.style = Toast.Style.Success;
    toast.title = "Opened agent skills";
    return;
  }

  const spawned = plan.result;
  if (!spawned.ok) {
    toast.style = Toast.Style.Failure;
    toast.title = "Could not start ShowMD";
    toast.message = spawned.error;
    return;
  }

  const found = await waitForServer(withSpawnedPort(prefs, spawned));
  if (!found.running) {
    toast.style = Toast.Style.Failure;
    toast.title = "ShowMD did not start in time";
    return;
  }

  await open(`${urlForPort(found.port)}skills/`);
  toast.style = Toast.Style.Success;
  toast.title = "Opened agent skills";
}
