import {
  Action,
  ActionPanel,
  Clipboard,
  getApplications,
  getPreferenceValues,
  Icon,
  launchCommand,
  LaunchType,
  open,
  openExtensionPreferences,
  showHUD,
  showToast,
  Toast,
  Keyboard,
} from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { startThread, threadURL } from "./amp";

const AMP_BUNDLE_ID = "com.ampcode.amp";

/** Opens an Amp URL in the Amp Mac app when preferred and installed, else in the browser. */
export async function openInAmp(url: string) {
  if (getPreferenceValues<Preferences>().openIn === "app") {
    const apps = await getApplications();
    const app = apps.find((a) => a.bundleId === AMP_BUNDLE_ID) ?? apps.find((a) => a.name === "Amp");
    if (app) return open(url, app);
  }
  return open(url);
}

export function OpenThreadAction({ id, title = "Open in Amp" }: { id: string; title?: string }) {
  return (
    <Action
      title={title}
      icon={Icon.Globe}
      shortcut={Keyboard.Shortcut.Common.Open}
      onAction={() => openInAmp(threadURL(id))}
    />
  );
}

/** Opens another command of this extension, showing why when Raycast refuses (for example, it is disabled). */
export async function launch(name: string) {
  try {
    await launchCommand({ name, type: LaunchType.UserInitiated });
  } catch (error) {
    await showFailureToast(error, { title: "Couldn't open command" });
  }
}

/**
 * Starts an orb thread with the default mode, in the given project or else the default one,
 * copies its URL, and opens it. Used by Start Thread and saved prompts.
 */
export async function startThreadAndOpen(prompt: string, project?: string) {
  const { defaultMode, defaultProject } = getPreferenceValues<Preferences>();
  const inProject = project?.trim() || defaultProject?.trim() || undefined;
  const url = await withToast(
    "Starting orb…",
    () => startThread({ prompt, project: inProject, mode: defaultMode }),
    "Thread started",
  );
  if (!url) return;
  try {
    await Clipboard.copy(url);
    await openInAmp(url);
    await showHUD("Amp thread started — URL copied");
  } catch (error) {
    await showFailureToast(error, { title: "Thread started, but it couldn't be opened" });
  }
}

/** Actions for an error view: try again, or fix the CLI path or token in preferences. */
export function RecoveryActions({ onRetry, children }: { onRetry: () => void; children?: React.ReactNode }) {
  return (
    <ActionPanel>
      <Action title="Try Again" icon={Icon.ArrowClockwise} onAction={onRetry} />
      <Action title="Open Extension Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
      {children}
    </ActionPanel>
  );
}

export function relativeTime(iso: string): string {
  const seconds = Math.round((Date.now() - new Date(iso).getTime()) / 1000);
  if (seconds < 45) return "now";
  const units: [number, string][] = [
    [60, "m"],
    [3600, "h"],
    [86400, "d"],
    [604800, "w"],
  ];
  let label = `${Math.round(seconds / 60)}m`;
  for (const [size, unit] of units) if (seconds >= size) label = `${Math.floor(seconds / size)}${unit}`;
  return label;
}

/** Runs an action with a loading toast that turns into a success or failure toast. */
export async function withToast<T>(title: string, run: () => Promise<T>, success: string): Promise<T | undefined> {
  const toast = await showToast({ style: Toast.Style.Animated, title });
  try {
    const result = await run();
    toast.style = Toast.Style.Success;
    toast.title = success;
    return result;
  } catch (error) {
    toast.style = Toast.Style.Failure;
    toast.title = "Amp failed";
    toast.message = error instanceof Error ? error.message : String(error);
    return undefined;
  }
}
