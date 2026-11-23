import { Toast, getApplications, open, showHUD, showToast } from "@raycast/api";
import { execFile } from "node:child_process";
import { existsSync } from "node:fs";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

export const CONSORT_BUNDLE_ID = "com.gavrilenko.Consort";
export const CONSORT_WEBSITE_URL = "https://consortaudio.com";
export const CONSORT_HOMEBREW_COMMAND = "brew install --cask nicolas-gavrilenko/tap/consort";

export interface ConsortSpeaker {
  id: string;
  displayName: string;
  model: string;
  transportKind: string;
}

export interface ConsortSavedApp {
  bundleID: string;
  displayName: string;
  bundlePath?: string;
}

export interface ConsortState {
  installed: boolean;
  running: boolean;
  leftSpeaker: ConsortSpeaker | null;
  rightSpeaker: ConsortSpeaker | null;
  volumePercent: number;
  balance: number;
  delayMs: number;
  routingMode: "all" | "selected";
  selectedBundleIDs: string[];
  savedApps: ConsortSavedApp[];
  cachedSpeakers: ConsortSpeaker[];
  wasStreaming: boolean;
}

interface RawDefaultsPayload {
  leftID: string | null;
  rightID: string | null;
  volume: number | null;
  balance: number | null;
  delayMs: number | null;
  routingMode: string;
  selectedBundleIDs: string[];
  wasStreaming: boolean;
  speakers: Record<
    string,
    {
      id?: string;
      displayName?: string;
      model?: string;
      transportKind?: string;
    }
  >;
  apps: Record<
    string,
    {
      bundleID?: string;
      displayName?: string;
      bundlePath?: string;
    }
  >;
}

const READ_DEFAULTS_JXA = `
ObjC.import("Foundation");
const d = $.NSUserDefaults.alloc.initWithSuiteName("com.gavrilenko.Consort");
const str = (k) => {
  const v = d.stringForKey(k);
  return v && !v.isNil() ? ObjC.unwrap(v) : null;
};
const num = (k) => (d.objectForKey(k) && !d.objectForKey(k).isNil() ? d.doubleForKey(k) : null);
const bool = (k) => Boolean(d.boolForKey(k));
const jsonData = (k) => {
  const data = d.dataForKey(k);
  if (!data || data.isNil()) return null;
  const s = $.NSString.alloc.initWithDataEncoding(data, $.NSUTF8StringEncoding);
  if (!s || s.isNil()) return null;
  try {
    return JSON.parse(ObjC.unwrap(s));
  } catch (e) {
    return null;
  }
};
const arr = (k) => {
  const a = d.stringArrayForKey(k);
  return a && !a.isNil() ? ObjC.deepUnwrap(a) : [];
};
JSON.stringify({
  leftID: str("Consort.LeftSpeakerID"),
  rightID: str("Consort.RightSpeakerID"),
  volume: num("Consort.MasterVolume"),
  balance: num("Consort.Balance"),
  delayMs: num("Consort.InterSpeakerDelayMs"),
  routingMode: str("Consort.RoutingMode") || "all",
  selectedBundleIDs: arr("Consort.SelectedBundleIDs"),
  wasStreaming: bool("Consort.WasStreamingLastSession"),
  speakers: jsonData("Consort.CachedSpeakers") || {},
  apps: jsonData("Consort.SavedAppMetadata") || {}
});
`;

export async function isConsortInstalled(): Promise<boolean> {
  try {
    const apps = await getApplications();
    if (apps.some((app) => app.bundleId === CONSORT_BUNDLE_ID)) {
      return true;
    }
  } catch {
    // Fall back to direct path check
  }
  return existsSync("/Applications/Consort.app");
}

export async function isConsortRunning(): Promise<boolean> {
  try {
    await execFileAsync("/usr/bin/pgrep", ["-x", "Consort"]);
    return true;
  } catch {
    return false;
  }
}

export async function readConsortState(): Promise<ConsortState> {
  const [installed, running] = await Promise.all([isConsortInstalled(), isConsortRunning()]);
  if (!installed) {
    return {
      installed: false,
      running: false,
      leftSpeaker: null,
      rightSpeaker: null,
      volumePercent: 50,
      balance: 0,
      delayMs: 0,
      routingMode: "all",
      selectedBundleIDs: [],
      savedApps: [],
      cachedSpeakers: [],
      wasStreaming: false,
    };
  }

  let payload: RawDefaultsPayload | null = null;
  try {
    const { stdout } = await execFileAsync("/usr/bin/osascript", ["-l", "JavaScript", "-e", READ_DEFAULTS_JXA]);
    const trimmed = stdout.trim();
    if (trimmed.length > 0) {
      payload = JSON.parse(trimmed) as RawDefaultsPayload;
    }
  } catch {
    payload = null;
  }

  const speakersMap = payload?.speakers ?? {};
  const cachedSpeakers: ConsortSpeaker[] = Object.entries(speakersMap)
    .map(([key, item]) => ({
      id: item.id || key,
      displayName: item.displayName || key,
      model: item.model || "",
      transportKind: item.transportKind || "airplay",
    }))
    .sort((a, b) => a.displayName.localeCompare(b.displayName));

  const findSpeaker = (id: string | null): ConsortSpeaker | null => {
    if (!id) return null;
    const match = cachedSpeakers.find((s) => s.id === id);
    if (match) return match;
    return { id, displayName: id, model: "", transportKind: "airplay" };
  };

  const appsMap = payload?.apps ?? {};
  const savedApps: ConsortSavedApp[] = Object.entries(appsMap)
    .map(([key, item]) => ({
      bundleID: item.bundleID || key,
      displayName: item.displayName || key,
      bundlePath: item.bundlePath && existsSync(item.bundlePath) ? item.bundlePath : undefined,
    }))
    .sort((a, b) => a.displayName.localeCompare(b.displayName));

  const rawVolume = payload?.volume;
  const volumePercent =
    typeof rawVolume === "number" && Number.isFinite(rawVolume)
      ? Math.round(Math.max(0, Math.min(1, rawVolume)) * 100)
      : 50;

  const rawBalance = payload?.balance;
  const balance =
    typeof rawBalance === "number" && Number.isFinite(rawBalance) ? Math.max(-1, Math.min(1, rawBalance)) : 0;

  const rawDelay = payload?.delayMs;
  const delayMs = typeof rawDelay === "number" && Number.isFinite(rawDelay) ? rawDelay : 0;

  const routingMode: "all" | "selected" = payload?.routingMode === "selected" ? "selected" : "all";

  return {
    installed: true,
    running,
    leftSpeaker: findSpeaker(payload?.leftID ?? null),
    rightSpeaker: findSpeaker(payload?.rightID ?? null),
    volumePercent,
    balance,
    delayMs,
    routingMode,
    selectedBundleIDs: payload?.selectedBundleIDs ?? [],
    savedApps,
    cachedSpeakers,
    wasStreaming: Boolean(payload?.wasStreaming),
  };
}

export async function runConsortAction(
  commandPath: string,
  options?: { hudMessage?: string; toastTitle?: string }
): Promise<boolean> {
  const installed = await isConsortInstalled();
  if (!installed) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Consort is not installed",
      message: "Download Consort from consortaudio.com to use this command.",
      primaryAction: {
        title: "Download Consort",
        onAction: () => open(CONSORT_WEBSITE_URL),
      },
    });
    return false;
  }

  await open(`consort://${commandPath}`);

  if (options?.hudMessage) {
    await showHUD(options.hudMessage);
  } else if (options?.toastTitle) {
    await showToast({
      style: Toast.Style.Success,
      title: options.toastTitle,
    });
  }
  return true;
}

export function formatTransportLabel(transportKind: string): string {
  switch (transportKind.toLowerCase()) {
    case "airplay":
      return "AirPlay";
    case "bluetooth":
      return "Bluetooth";
    case "wired":
      return "Wired";
    case "builtin":
      return "My Mac";
    default:
      return transportKind;
  }
}

export function formatBalance(balance: number): string {
  const pct = Math.round(balance * 100);
  if (Math.abs(pct) <= 1) {
    return "Centered";
  }
  return pct < 0 ? `Left ${Math.abs(pct)}%` : `Right ${pct}%`;
}

export function formatDelay(delayMs: number): string {
  const rounded = Math.round(delayMs * 10) / 10;
  if (Math.abs(rounded) < 0.05) {
    return "0 ms";
  }
  const sign = rounded > 0 ? "+" : "";
  return `${sign}${rounded} ms`;
}

export function formatActiveSourceSummary(state: ConsortState): string {
  if (state.routingMode === "all" || state.selectedBundleIDs.length === 0) {
    return "All Mac Audio";
  }
  const names = state.selectedBundleIDs.map((bundleID) => {
    const app = state.savedApps.find((item) => item.bundleID === bundleID);
    return app ? app.displayName : bundleID;
  });
  return names.join(", ");
}

export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
