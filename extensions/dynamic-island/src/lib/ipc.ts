import { getPreferenceValues } from "@raycast/api";
import { exec, spawn } from "child_process";
import * as fs from "fs";
import * as path from "path";
import { promisify } from "util";

const execAsync = promisify(exec);

export const STATUS_FILE = "/tmp/dynamic_island_status.json";
export const DEFAULTS_DOMAIN = "com.raycast.island";
export const NOTIFICATION_PREFIX = "com.raycast.island";

export interface ExtensionPreferences {
  islandStyle?: "auto" | "notch" | "pill";
  hoverToExpand?: boolean;
  autohideTimeout?: string;
  showMediaWidget?: boolean;
  showMixerWidget?: boolean;
  showSystemWidget?: boolean;
  showTimerWidget?: boolean;
  showCalendarWidget?: boolean;
  showMetricCPU?: boolean;
  showMetricGPU?: boolean;
  showMetricMemory?: boolean;
  showMetricBattery?: boolean;
  showMetricNetwork?: boolean;
  showMetricDisk?: boolean;
}

export interface MediaTrackInfo {
  title: string;
  artist: string;
  album: string;
  isPlaying: boolean;
  duration: number;
  elapsed: number;
  appName: string;
}

export interface FocusTimerInfo {
  isRunning: boolean;
  totalSeconds: number;
  remainingSeconds: number;
  title: string;
  progress: number;
}

export interface ShelfItemInfo {
  id: string;
  name: string;
  path: string;
}

export interface SystemMetricsInfo {
  cpuPercent: number;
  ramPercent: number;
  batteryPercent: number;
  isCharging: boolean;
}

export interface IslandStatus {
  status: string;
  action?: string;
  isExpanded: boolean;
  activeWidget:
    | "music"
    | "timer"
    | "shelf"
    | "system"
    | "controls"
    | "files"
    | "mixer"
    | "calendar";
  hasHardwareNotch: boolean;
  notchWidth: number;
  notchHeight: number;
  media: MediaTrackInfo;
  timer: FocusTimerInfo;
  shelfCount: number;
  shelfItems: ShelfItemInfo[];
  system: SystemMetricsInfo;
}

function getBinaryPath(): string {
  const possiblePaths = [
    path.join(
      __dirname,
      "..",
      "bin",
      "DynamicIsland.app",
      "Contents",
      "MacOS",
      "DynamicIsland",
    ),
    path.join(
      __dirname,
      "..",
      "..",
      "bin",
      "DynamicIsland.app",
      "Contents",
      "MacOS",
      "DynamicIsland",
    ),
    path.join(
      process.cwd(),
      "bin",
      "DynamicIsland.app",
      "Contents",
      "MacOS",
      "DynamicIsland",
    ),
    "/Users/abhay/Desktop/dynamic-island/bin/DynamicIsland.app/Contents/MacOS/DynamicIsland",
    path.join(__dirname, "..", "bin", "DynamicIsland"),
    "/Users/abhay/Desktop/dynamic-island/bin/DynamicIsland",
  ];

  for (const p of possiblePaths) {
    if (fs.existsSync(p)) {
      return p;
    }
  }
  return possiblePaths[0];
}

function getNotifyHelperPath(): string {
  const possiblePaths = [
    path.join(__dirname, "..", "bin", "island-notify"),
    path.join(__dirname, "..", "..", "bin", "island-notify"),
    path.join(process.cwd(), "bin", "island-notify"),
    "/Users/abhay/Desktop/dynamic-island/bin/island-notify",
  ];

  for (const p of possiblePaths) {
    if (fs.existsSync(p)) {
      return p;
    }
  }
  return possiblePaths[0];
}

/**
 * Checks whether the Dynamic Island native daemon is currently running.
 */
export async function isDaemonRunning(): Promise<boolean> {
  try {
    const { stdout } = await execAsync(
      "pgrep -f 'DynamicIsland.*--notch-daemon'",
    );
    return stdout.trim().length > 0;
  } catch {
    return false;
  }
}

/**
 * Sends a distributed notification to the native Notch engine.
 */
export async function postDistributedNotification(
  notificationName: string,
): Promise<void> {
  const helper = getNotifyHelperPath();
  if (fs.existsSync(helper)) {
    try {
      await execAsync(`"${helper}" "${notificationName}"`);
      return;
    } catch {
      // Fallback below
    }
  }

  // Swift inline fallback
  try {
    const cmd = `swift -e 'import Foundation; DistributedNotificationCenter.default().postNotificationName(Notification.Name("${notificationName}"), object: nil, userInfo: nil, deliverImmediately: true)'`;
    await execAsync(cmd);
  } catch {
    // Ignore fallback errors
  }
}

/**
 * Synchronizes Raycast extension preferences directly to the Dynamic Island engine.
 */
export async function syncPreferencesToDefaults(): Promise<void> {
  try {
    const prefs = getPreferenceValues<ExtensionPreferences>();
    const commands: string[] = [];

    if (prefs.showMediaWidget !== undefined) {
      commands.push(
        `defaults write ${DEFAULTS_DOMAIN} showMediaWidget -bool ${prefs.showMediaWidget}`,
      );
    }
    if (prefs.showMixerWidget !== undefined) {
      commands.push(
        `defaults write ${DEFAULTS_DOMAIN} showMixerWidget -bool ${prefs.showMixerWidget}`,
      );
    }
    if (prefs.showSystemWidget !== undefined) {
      commands.push(
        `defaults write ${DEFAULTS_DOMAIN} showSystemWidget -bool ${prefs.showSystemWidget}`,
      );
    }
    if (prefs.showTimerWidget !== undefined) {
      commands.push(
        `defaults write ${DEFAULTS_DOMAIN} showTimerWidget -bool ${prefs.showTimerWidget}`,
      );
    }
    if (prefs.showCalendarWidget !== undefined) {
      commands.push(
        `defaults write ${DEFAULTS_DOMAIN} showCalendarWidget -bool ${prefs.showCalendarWidget}`,
      );
    }

    if (prefs.showMetricCPU !== undefined) {
      commands.push(
        `defaults write ${DEFAULTS_DOMAIN} showMetricCPU -bool ${prefs.showMetricCPU}`,
      );
    }
    if (prefs.showMetricGPU !== undefined) {
      commands.push(
        `defaults write ${DEFAULTS_DOMAIN} showMetricGPU -bool ${prefs.showMetricGPU}`,
      );
    }
    if (prefs.showMetricMemory !== undefined) {
      commands.push(
        `defaults write ${DEFAULTS_DOMAIN} showMetricMemory -bool ${prefs.showMetricMemory}`,
      );
    }
    if (prefs.showMetricBattery !== undefined) {
      commands.push(
        `defaults write ${DEFAULTS_DOMAIN} showMetricBattery -bool ${prefs.showMetricBattery}`,
      );
    }
    if (prefs.showMetricNetwork !== undefined) {
      commands.push(
        `defaults write ${DEFAULTS_DOMAIN} showMetricNetwork -bool ${prefs.showMetricNetwork}`,
      );
    }
    if (prefs.showMetricDisk !== undefined) {
      commands.push(
        `defaults write ${DEFAULTS_DOMAIN} showMetricDisk -bool ${prefs.showMetricDisk}`,
      );
    }

    if (prefs.hoverToExpand !== undefined) {
      commands.push(
        `defaults write ${DEFAULTS_DOMAIN} notchOpenOnHover -bool ${prefs.hoverToExpand}`,
      );
      commands.push(
        `defaults write ${DEFAULTS_DOMAIN} notchHoverExpands -bool ${prefs.hoverToExpand}`,
      );
    }
    if (prefs.islandStyle !== undefined) {
      commands.push(
        `defaults write ${DEFAULTS_DOMAIN} notchSilhouette -string "${prefs.islandStyle === "pill" ? "capsule" : "notch"}"`,
      );
    }
    if (commands.length > 0) {
      await execAsync(commands.join(" && "));
    }
  } catch {
    // Ignore outside of Raycast command environment
  }
}

/**
 * Updates the visibility of an individual widget in the Island Menu.
 */
export async function setWidgetVisibility(
  widget: "media" | "mixer" | "system" | "timer" | "calendar",
  visible: boolean,
): Promise<void> {
  const key =
    widget === "media"
      ? "showMediaWidget"
      : widget === "mixer"
        ? "showMixerWidget"
        : widget === "system"
          ? "showSystemWidget"
          : widget === "timer"
            ? "showTimerWidget"
            : "showCalendarWidget";
  await execAsync(`defaults write ${DEFAULTS_DOMAIN} ${key} -bool ${visible}`);
  await postDistributedNotification(`${NOTIFICATION_PREFIX}.requestStatus`);
}

/**
 * Updates the visibility of an individual metric in the System UI.
 */
export async function setMetricVisibility(
  metric: "CPU" | "GPU" | "Memory" | "Battery" | "Network" | "Disk",
  visible: boolean,
): Promise<void> {
  await execAsync(
    `defaults write ${DEFAULTS_DOMAIN} showMetric${metric} -bool ${visible}`,
  );
  await postDistributedNotification(`${NOTIFICATION_PREFIX}.requestStatus`);
}

/**
 * Launches the native Dynamic Island daemon in the background if not already running.
 */
export async function startDaemonIfNotRunning(): Promise<void> {
  const running = await isDaemonRunning();
  if (running) {
    await syncPreferencesToDefaults();
    return;
  }

  // Configure defaults for Dynamic Island notch out-of-the-box
  try {
    const defaultsSetup = [
      `defaults write ${DEFAULTS_DOMAIN} hasOnboarded -bool true`,
      `defaults write ${DEFAULTS_DOMAIN} "featureAvailable.notch" -bool true`,
      `defaults write ${DEFAULTS_DOMAIN} "featureAvailable.mixer" -bool true`,
      `defaults write ${DEFAULTS_DOMAIN} "featureAvailable.brightness" -bool true`,
      `defaults write ${DEFAULTS_DOMAIN} brightnessControlEnabled -bool true`,
      `defaults write ${DEFAULTS_DOMAIN} "featureAvailable.monitorCPU" -bool true`,
      `defaults write ${DEFAULTS_DOMAIN} "featureAvailable.monitorMemory" -bool true`,
      `defaults write ${DEFAULTS_DOMAIN} "featureAvailable.monitorPower" -bool true`,
      `defaults write ${DEFAULTS_DOMAIN} "featureAvailable.monitorNetwork" -bool true`,
      `defaults write ${DEFAULTS_DOMAIN} "featureAvailable.monitorDisk" -bool true`,
      `defaults write ${DEFAULTS_DOMAIN} notchEnabled -bool true`,
      `defaults write ${DEFAULTS_DOMAIN} notchOpenOnHover -bool true`,
      `defaults write ${DEFAULTS_DOMAIN} notchHoverExpands -bool true`,
      `defaults write ${DEFAULTS_DOMAIN} notchHideUntilHover -bool false`,
      `defaults write ${DEFAULTS_DOMAIN} "featureAvailable.notchMusic" -bool true`,
      `defaults write ${DEFAULTS_DOMAIN} "featureAvailable.notchTimer" -bool true`,
      `defaults write ${DEFAULTS_DOMAIN} "featureAvailable.notchCalendar" -bool true`,
      `defaults write ${DEFAULTS_DOMAIN} "featureAvailable.shelf" -bool false`,
      `defaults write ${DEFAULTS_DOMAIN} "featureAvailable.notchShelf" -bool false`,
      `defaults write ${DEFAULTS_DOMAIN} launchAtLogin -bool false`,
      `defaults write ${DEFAULTS_DOMAIN} notchSilhouette -string "notch"`,
      `defaults write ${DEFAULTS_DOMAIN} notchHoverDelay -float 0.1`,
    ].join(" && ");
    await execAsync(defaultsSetup);
    await syncPreferencesToDefaults();
  } catch {
    // Ignore defaults errors
  }

  const binaryPath = getBinaryPath();
  if (!fs.existsSync(binaryPath)) {
    throw new Error(`Dynamic Island binary not found at ${binaryPath}`);
  }

  const child = spawn(binaryPath, ["--notch-daemon"], {
    detached: true,
    stdio: "ignore",
  });
  child.unref();

  // Wait for status file or process up to 3 seconds
  const startTime = Date.now();
  while (Date.now() - startTime < 3000) {
    if (fs.existsSync(STATUS_FILE)) {
      break;
    }
    const isUp = await isDaemonRunning();
    if (isUp) break;
    await new Promise((r) => setTimeout(r, 150));
  }
}

/**
 * Stops the running Dynamic Island daemon.
 */
export async function stopDaemon(): Promise<void> {
  try {
    await execAsync("pkill -f 'DynamicIsland.*--notch-daemon' || true");
  } catch {
    // Ignore
  }
  if (fs.existsSync(STATUS_FILE)) {
    try {
      fs.unlinkSync(STATUS_FILE);
    } catch {
      // Ignore
    }
  }
}

/**
 * Fetches the current full status of the Dynamic Island.
 */
export async function getIslandStatus(): Promise<IslandStatus | null> {
  const isUp = await isDaemonRunning();
  if (!isUp) {
    try {
      await startDaemonIfNotRunning();
    } catch {
      return null;
    }
  }

  if (fs.existsSync(STATUS_FILE)) {
    try {
      const raw = fs.readFileSync(STATUS_FILE, "utf-8");
      const parsed = JSON.parse(raw);
      return {
        status: parsed.status ?? "ok",
        action: parsed.action,
        isExpanded: Boolean(parsed.isExpanded),
        activeWidget: parsed.activeWidget ?? "music",
        hasHardwareNotch: Boolean(parsed.hasHardwareNotch),
        notchWidth: Number(parsed.notchWidth ?? 220),
        notchHeight: Number(parsed.notchHeight ?? 38),
        media: {
          title: parsed.media?.title ?? "No Media Playing",
          artist: parsed.media?.artist ?? "",
          album: parsed.media?.album ?? "",
          isPlaying: Boolean(parsed.media?.isPlaying),
          duration: Number(parsed.media?.duration ?? 0),
          elapsed: Number(parsed.media?.elapsed ?? 0),
          appName: parsed.media?.appName ?? "",
        },
        timer: {
          isRunning: Boolean(parsed.timer?.isRunning),
          totalSeconds: Number(parsed.timer?.totalSeconds ?? 0),
          remainingSeconds: Number(parsed.timer?.remainingSeconds ?? 0),
          title: parsed.timer?.title ?? "Focus Session",
          progress: Number(parsed.timer?.progress ?? 0),
        },
        shelfCount: Number(parsed.shelfCount ?? 0),
        shelfItems: Array.isArray(parsed.shelfItems) ? parsed.shelfItems : [],
        system: {
          cpuPercent: Number(parsed.system?.cpuPercent ?? 0),
          ramPercent: Number(parsed.system?.ramPercent ?? 0),
          batteryPercent: Number(parsed.system?.batteryPercent ?? 100),
          isCharging: Boolean(parsed.system?.isCharging),
        },
      };
    } catch {
      // Return fallback below
    }
  }

  return {
    status: "ok",
    isExpanded: false,
    activeWidget: "music",
    hasHardwareNotch: true,
    notchWidth: 220,
    notchHeight: 38,
    media: {
      title: "No Media Playing",
      artist: "",
      album: "",
      isPlaying: false,
      duration: 0,
      elapsed: 0,
      appName: "",
    },
    timer: {
      isRunning: false,
      totalSeconds: 0,
      remainingSeconds: 0,
      title: "Focus Session",
      progress: 0,
    },
    shelfCount: 0,
    shelfItems: [],
    system: {
      cpuPercent: 0,
      ramPercent: 0,
      batteryPercent: 100,
      isCharging: false,
    },
  };
}

/**
 * Sends a command to the Dynamic Island engine via Raycast IPC.
 */
export async function sendSocketCommand<T = IslandStatus>(
  command: Record<string, unknown>,
): Promise<T> {
  const isUp = await isDaemonRunning();
  if (!isUp) {
    await startDaemonIfNotRunning();
  }

  const action = command.action as string | undefined;

  switch (action) {
    case "toggle":
      await postDistributedNotification(`${NOTIFICATION_PREFIX}.toggle`);
      break;

    case "expand":
    case "open": {
      const widget = command.widget as string | undefined;
      if (widget === "music" || widget === "media") {
        await postDistributedNotification(`${NOTIFICATION_PREFIX}.openMusic`);
      } else if (widget === "mixer") {
        await postDistributedNotification(`${NOTIFICATION_PREFIX}.openMixer`);
      } else if (widget === "timer") {
        await postDistributedNotification(`${NOTIFICATION_PREFIX}.openTimer`);
      } else if (widget === "system") {
        await postDistributedNotification(`${NOTIFICATION_PREFIX}.openSystem`);
      } else if (widget === "calendar") {
        await postDistributedNotification(
          `${NOTIFICATION_PREFIX}.openCalendar`,
        );
      } else {
        await postDistributedNotification(`${NOTIFICATION_PREFIX}.open`);
      }
      break;
    }

    case "collapse":
    case "close":
      await postDistributedNotification(`${NOTIFICATION_PREFIX}.collapse`);
      break;

    case "set_widget": {
      const widget = command.widget as string | undefined;
      if (widget === "music" || widget === "media") {
        await postDistributedNotification(`${NOTIFICATION_PREFIX}.openMusic`);
      } else if (widget === "mixer") {
        await postDistributedNotification(`${NOTIFICATION_PREFIX}.openMixer`);
      } else if (widget === "timer") {
        await postDistributedNotification(`${NOTIFICATION_PREFIX}.openTimer`);
      } else if (widget === "system") {
        await postDistributedNotification(`${NOTIFICATION_PREFIX}.openSystem`);
      } else if (widget === "calendar") {
        await postDistributedNotification(
          `${NOTIFICATION_PREFIX}.openCalendar`,
        );
      }
      break;
    }

    case "media_playpause":
      try {
        await execAsync(`osascript -e '
          if application "Spotify" is running then
            tell application "Spotify" to playpause
          else if application "Music" is running then
            tell application "Music" to playpause
          end if
        '`);
      } catch {
        // Ignore
      }
      break;

    case "media_next":
      try {
        await execAsync(`osascript -e '
          if application "Spotify" is running then
            tell application "Spotify" to next track
          else if application "Music" is running then
            tell application "Music" to next track
          end if
        '`);
      } catch {
        // Ignore
      }
      break;

    case "media_prev":
      try {
        await execAsync(`osascript -e '
          if application "Spotify" is running then
            tell application "Spotify" to previous track
          else if application "Music" is running then
            tell application "Music" to previous track
          end if
        '`);
      } catch {
        // Ignore
      }
      break;

    case "quit":
      await stopDaemon();
      return { status: "ok" } as unknown as T;

    case "status":
    default:
      break;
  }

  // Small delay for daemon state sync
  await new Promise((r) => setTimeout(r, 120));

  const status = await getIslandStatus();
  return (status || { status: "ok" }) as unknown as T;
}
