import { logger } from "@chrismessina/raycast-logger";
import { AI, Cache, open, showToast, Toast } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { copyError } from "./copy-error";
import {
  appToStart,
  baseUrl,
  isLocalServer,
  OsaurusNotFoundError,
  quitApp,
  runningApps,
  ServerDownError,
} from "./osaurus";

// Poll until the server answers (it took ~2 s locally). Raw fetch: refusals here are expected, not worth a warning.
async function waitForServer(timeoutMs = 20_000): Promise<boolean> {
  const deadline = performance.now() + timeoutMs;
  // Probes at least once, so a zero timeout is a plain health check.
  for (;;) {
    try {
      if ((await fetch(`${baseUrl()}/api/tags`, { signal: AbortSignal.timeout(1000) })).ok) return true;
    } catch {
      // not up yet
    }
    if (performance.now() >= deadline) return false;
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
}

// Starts the server by (re)launching the Osaurus build that served last. Resolves true once the server answers.
export async function openOsaurus(): Promise<boolean> {
  // A stale toast clicked after the server came back must not relaunch a healthy app.
  if (await waitForServer(0)) return true;
  // A remote server can't be started from here; just wait in case it's on its way back.
  if (!isLocalServer()) return waitForServer();
  const app = await appToStart();
  if (!app) throw new OsaurusNotFoundError();
  try {
    // Open but not serving (its server was stopped): relaunching is the only way to restart it.
    const relaunch = (await runningApps()).includes(app);
    logger.log(relaunch ? "Relaunching app to restart its server" : "Launching app", { app });
    if (relaunch) await quitApp(app);
    await open(app);
  } catch (error) {
    logger.warn("Starting Osaurus failed", error);
  }
  return waitForServer();
}

// Opens Osaurus while reporting progress on a toast (an existing one, or a new one).
export async function openOsaurusWithToast(onReady?: () => void, existing?: Toast) {
  const toast = existing ?? (await showToast({ style: Toast.Style.Animated, title: "Opening Osaurus…" }));
  toast.style = Toast.Style.Animated;
  toast.title = "Opening Osaurus…";
  // A reused server-down toast still carries its Open Osaurus and Copy Error actions.
  toast.primaryAction = undefined;
  toast.secondaryAction = undefined;
  let ready: boolean;
  try {
    ready = await openOsaurus();
  } catch (error) {
    toast.style = Toast.Style.Failure;
    toast.title = "Couldn't find Osaurus";
    toast.message = error instanceof Error ? error.message : String(error);
    toast.primaryAction = copyError(error);
    return;
  }
  if (ready) {
    toast.style = Toast.Style.Success;
    toast.title = "Osaurus is running";
    onReady?.();
  } else {
    logger.warn("Osaurus opened but its server never answered");
    toast.style = Toast.Style.Failure;
    toast.title = "Osaurus opened, but its server didn't start";
    toast.primaryAction = copyError(`Osaurus opened, but its server didn't answer at ${baseUrl()}`);
  }
}

export const OSAURUS_DOWNLOAD_URL = "https://osaurus.ai";

// Failure toast whose primary action opens Osaurus, then calls onReady once the server answers.
// With no Osaurus installed (a first run), it offers the download instead.
export async function showServerDownToast(onReady?: () => void) {
  if (isLocalServer() && !(await appToStart())) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Osaurus isn't installed",
      message: "It runs the AI models this extension uses.",
      primaryAction: { title: "Download Osaurus", onAction: () => open(OSAURUS_DOWNLOAD_URL) },
      secondaryAction: copyError("Osaurus isn't installed"),
    });
    return;
  }
  await showToast({
    style: Toast.Style.Failure,
    title: "Osaurus isn't running",
    primaryAction: { title: "Open Osaurus", onAction: (toast) => openOsaurusWithToast(onReady, toast) },
    secondaryAction: copyError(`Osaurus isn't running at ${baseUrl()}`),
  });
}

// usePromise onError handler: the Open Osaurus toast for a stopped server, the default toast otherwise.
// Takes a ref because the hook's own revalidate doesn't exist yet when its options are built.
export function handleLoadError(reload: { current?: () => void }) {
  return (error: Error) => {
    if (error instanceof ServerDownError) return void showServerDownToast(() => reload.current?.());
    void showFailureToast(error, { title: "Couldn't reach Osaurus", primaryAction: copyError(error) });
  };
}

// Opens an osaurus:// or huggingface:// link in the Osaurus build the user runs, not whichever build
// macOS registered for the scheme. Launching it this way also starts its server.
export async function openInOsaurus(url: string): Promise<boolean> {
  const app = await appToStart();
  if (!app) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Couldn't find Osaurus",
      message: new OsaurusNotFoundError().message,
      primaryAction: copyError(new OsaurusNotFoundError()),
    });
    return false;
  }
  logger.log("Opening link in Osaurus", { url, app });
  await open(url, app);
  return true;
}

export const OSAURUS_MODELS_URL = "osaurus://settings?tab=models";
// The older huggingface:// link works in every Osaurus build; osaurus://open_from_hf does not.
export const huggingFaceModelUrl = (repo: string) => `huggingface://?model=${encodeURIComponent(repo)}`;

// Tells Raycast AI to re-read the model list when the set of Osaurus models changed since the last
// look, e.g. after a download finished in Osaurus. Raycast also refreshes on its own schedule.
const modelCache = new Cache();
// Each command keeps its own key: Manage Models sees every model, Ask only chat models, and a
// shared key would flip between the two sets and refresh on every switch.
export function syncRaycastModels(source: "manage" | "ask", ids: string[]) {
  const key = [...ids].sort().join("\n");
  const cacheKey = `raycast-model-ids-${source}`;
  if (modelCache.get(cacheKey) === key) return;
  modelCache.set(cacheKey, key);
  logger.log("Osaurus models changed; refreshing Raycast AI", { ids });
  AI.refreshModels().catch((error) => logger.warn("AI.refreshModels failed", error));
}
