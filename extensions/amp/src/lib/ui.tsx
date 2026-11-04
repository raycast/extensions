import {
  Action,
  ActionPanel,
  getApplications,
  getPreferenceValues,
  Icon,
  open,
  openExtensionPreferences,
  showToast,
  Toast,
} from "@raycast/api";
import { threadURL } from "./amp";

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

export function OpenThreadAction({ id, title = "Open Thread" }: { id: string; title?: string }) {
  return <Action title={title} icon={Icon.Globe} onAction={() => openInAmp(threadURL(id))} />;
}

/** Actions for an error view: try again, or fix the CLI path or token in preferences. */
export function RecoveryActions({ onRetry }: { onRetry: () => void }) {
  return (
    <ActionPanel>
      <Action title="Try Again" icon={Icon.ArrowClockwise} onAction={onRetry} />
      <Action title="Open Extension Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
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
