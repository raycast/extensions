import { environment, getPreferenceValues, LocalStorage, showInFinder } from "@raycast/api";
import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdir, readFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import { lock } from "proper-lockfile";
import { getDefaultSelection, readLocations } from "./locations";
import { getPNG, getSky, ImageSize, SkyFromError, SkyRequest } from "./skyfrom-api";
import { writeAtomic } from "./sky-cache";

const run = promisify(execFile);
const directory = join(environment.supportPath, "wallpapers");
const autoKey = "automatic-wallpaper-v1";
const windows = process.platform === "win32";

type AutoState = {
  pausedByUser?: boolean;
  config?: string;
  failures?: number;
  lastSuccess?: number;
};

export async function autoState(): Promise<AutoState> {
  const value = await LocalStorage.getItem<string>(autoKey);
  return value ? JSON.parse(value) : {};
}

async function saveAutoState(state: AutoState) {
  await LocalStorage.setItem(autoKey, JSON.stringify(state));
}

function errorText(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

async function nativeWallpaper(operation: "inspect" | "apply", path?: string, displayId?: number): Promise<unknown> {
  try {
    const options = { timeout: 15_000, maxBuffer: 32_768, windowsHide: true };
    if (windows) {
      const script = await readFile(join(environment.assetsPath, "wallpaper.ps1"), "utf8");
      const command = Buffer.from(script, "utf16le").toString("base64");
      const executable = join(
        process.env.SystemRoot ?? "C:\\Windows",
        "System32",
        "WindowsPowerShell",
        "v1.0",
        "powershell.exe",
      );
      const { stdout } = await run(
        executable,
        ["-NoLogo", "-NoProfile", "-NonInteractive", "-EncodedCommand", command],
        {
          ...options,
          env: { ...process.env, SKYFROM_WALLPAPER_OP: operation, SKYFROM_WALLPAPER_IMAGE: path },
        },
      );
      return JSON.parse(stdout);
    }

    const args = operation === "apply" ? [operation, path ?? "", String(displayId)] : [operation];
    const { stdout } = await run(
      "/usr/bin/osascript",
      ["-l", "JavaScript", join(environment.assetsPath, "wallpaper.jxa"), ...args],
      options,
    );
    return JSON.parse(stdout);
  } catch (error) {
    const message = errorText(error);
    if (message.includes("PERMISSION_DENIED")) {
      throw new Error(
        windows
          ? "Windows denied the wallpaper change. Check whether your device allows wallpaper changes."
          : "macOS denied the wallpaper change. Check Raycast’s permissions in System Settings → Privacy & Security.",
      );
    }
    if (message.includes("DISPLAY_CHANGED") || message.includes("NO_SCREEN")) {
      throw new Error("The primary display is unavailable or changed. Try again with the display connected.");
    }
    if (message.includes("INVALID_IMAGE"))
      throw new Error("The wallpaper PNG couldn’t be decoded. Try again in a moment.");
    if (operation === "inspect") {
      throw new Error("Couldn’t identify the primary display. Try again with the display connected and awake.");
    }
    throw new Error(
      windows
        ? "Windows couldn’t set the wallpaper. Check that you can change it in Settings → Personalization."
        : "macOS couldn’t set the wallpaper on the primary desktop. Try again while signed in and the display is awake.",
    );
  }
}

function fitDisplay({ width, height }: ImageSize): ImageSize {
  const scale = Math.min(1, 4096 / Math.max(width, height));
  return { width: Math.max(1, Math.round(width * scale)), height: Math.max(1, Math.round(height * scale)) };
}

async function primaryDisplay() {
  const info = await nativeWallpaper("inspect");
  if (
    typeof info !== "object" ||
    !info ||
    !("width" in info) ||
    !("height" in info) ||
    typeof info.width !== "number" ||
    typeof info.height !== "number" ||
    !Number.isInteger(info.width) ||
    info.width < 1 ||
    !Number.isInteger(info.height) ||
    info.height < 1
  ) {
    throw new Error("Couldn’t identify the primary display. Try again with the display connected.");
  }
  const id = "displayId" in info && typeof info.displayId === "number" ? info.displayId : undefined;
  if (!windows && id === undefined) {
    throw new Error("Couldn’t identify the primary display. Try again with the display connected.");
  }
  return { size: fitDisplay({ width: info.width, height: info.height }), id };
}

async function withWallpaperLock<T>(task: () => Promise<T>) {
  await mkdir(directory, { recursive: true });
  let release: () => Promise<void>;
  try {
    release = await lock(directory, { stale: 45_000 });
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "ELOCKED") return undefined;
    throw error;
  }
  try {
    return await task();
  } finally {
    await release();
  }
}

function imageHash(data: Buffer) {
  return createHash("sha256").update(data).digest("hex");
}

async function saveCopy(sky: SkyRequest, data: Buffer) {
  const folder = getPreferenceValues<Preferences>().wallpaperDirectory || join(homedir(), "Downloads");
  const name = `SkyFrom-${sky.city.slug}-${imageHash(data).slice(0, 12)}.png`;
  const path = join(folder, name);
  try {
    await mkdir(folder, { recursive: true });
    const existing = await readFile(path).catch(() => undefined);
    if (!existing?.equals(data)) await writeAtomic(path, data);
    return path;
  } catch {
    throw new Error("Couldn’t save the PNG. Choose a writable wallpaper directory in extension settings.");
  }
}

async function apply(sky: SkyRequest) {
  const display = await primaryDisplay();
  const { value } = await getPNG(sky, display.size, { staleOnError: false });
  const path = join(directory, `${imageHash(value)}.png`);
  const diskImage = await readFile(path).catch(() => undefined);
  if (!diskImage?.equals(value)) await writeAtomic(path, value);

  const result = await nativeWallpaper("apply", path, display.id);
  const screens = typeof result === "object" && result && "screens" in result ? Number(result.screens) : 1;
  return { primaryOnly: !windows && screens > 1, data: value };
}

export async function applyWallpaper(sky: SkyRequest) {
  if (sky.local) await getSky(sky);
  const result = await withWallpaperLock(() => apply(sky));
  if (!result) throw new Error("A wallpaper update is already running. Try again in a moment.");
  const title = result.primaryOnly ? "Wallpaper set on the primary display" : "Sky wallpaper set";
  if (getPreferenceValues<Preferences>().saveImages) {
    try {
      await saveCopy(sky, result.data);
    } catch (error) {
      return { title, warning: errorText(error) };
    }
  }
  return { title };
}

export async function downloadWallpaper(sky: SkyRequest) {
  const display = await primaryDisplay();
  const { value } = await getPNG(sky, display.size);
  await showInFinder(await saveCopy(sky, value));
}

export async function toggleAutoPause() {
  const result = await withWallpaperLock(async () => {
    const state = await autoState();
    const pausedByUser = !state.pausedByUser && (state.failures ?? 0) < 3;
    await saveAutoState({ ...state, pausedByUser, failures: 0 });
    return pausedByUser;
  });
  if (result === undefined) throw new Error("A wallpaper update is already running. Try again in a moment.");
  return result;
}

export type AutoResult =
  | { kind: "disabled" | "busy" | "waiting" | "paused" }
  | { kind: "success"; city: string; primaryOnly: boolean }
  | { kind: "limited"; message: string }
  | { kind: "failure"; message: string; paused: boolean };

export async function runAutoWallpaper(manual: boolean): Promise<AutoResult> {
  const preferences = getPreferenceValues<Preferences>();
  if (!manual && !preferences.autoWallpaper) return { kind: "disabled" };
  return (
    (await withWallpaperLock(async (): Promise<AutoResult> => {
      const previous = await autoState();
      const interval = preferences.updateFrequency === "15" ? 15 : preferences.updateFrequency === "60" ? 60 : 30;
      const override = preferences.autoCity?.trim();
      // Include the saved default in the configuration so choosing a new city clears a failure pause.
      const locations = await readLocations();
      const { defaultCity, defaultFavorite, favorites } = locations;
      const config = JSON.stringify([
        override ||
          favorites.find(({ id }) => id === defaultFavorite)?.city.slug ||
          defaultCity?.slug ||
          preferences.defaultCity?.trim(),
        interval,
      ]);
      const sameConfig = previous.config === config;
      const failures = sameConfig ? (previous.failures ?? 0) : 0;
      if (!manual) {
        if (previous.pausedByUser || failures >= 3) return { kind: "paused" };
        if (sameConfig && Date.now() - (previous.lastSuccess ?? 0) < interval * 60_000) return { kind: "waiting" };
      }

      let result: { primaryOnly: boolean; city: string };
      try {
        const selection = await getDefaultSelection({ override, forceNow: true, state: locations });
        if (!selection)
          throw new Error("Set a default city or choose an automatic wallpaper city in extension settings.");
        const current = await getSky({ city: selection.city }, { staleOnError: false });
        const applied = await apply({ city: selection.city, local: current.value.local });
        result = { primaryOnly: applied.primaryOnly, city: selection.city.name };
      } catch (error) {
        if (error instanceof SkyFromError && error.kind === "limited")
          return { kind: "limited", message: error.message };
        await saveAutoState({
          ...previous,
          config,
          failures: failures + 1,
          lastSuccess: sameConfig ? previous.lastSuccess : undefined,
        });
        return { kind: "failure", paused: failures + 1 >= 3, message: errorText(error) };
      }

      await saveAutoState({ ...previous, config, failures: 0, lastSuccess: Date.now() });
      return { kind: "success", city: result.city, primaryOnly: result.primaryOnly };
    })) ?? { kind: "busy" }
  );
}
