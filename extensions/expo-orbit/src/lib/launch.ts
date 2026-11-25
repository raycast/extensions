import { open } from "@raycast/api";
import { homedir } from "node:os";
import path from "node:path";
import { z } from "zod";
import { bootDevice, Device } from "./devices";
import { syncTrustedSources } from "./trusted-sources";
import { getOrbitAppPath, OrbitError, OrbitNotInstalledError, parseDownloadProgress, runOrbit } from "./orbit";

/** What the user wants to open on a device. */
export type LaunchSource =
  | { kind: "file"; path: string }
  | { kind: "build"; url: string; launchUrl?: string }
  | { kind: "update"; url: string }
  | { kind: "snack"; url: string; sdkVersion?: string };

const ORBIT_SCHEMES = ["expo-orbit:", "expomenubar:"];
const APP_FILE_EXTENSIONS = [".apk", ".ipa", ".app", ".tar.gz", ".tgz", ".zip"];

function expandHome(input: string): string {
  return input === "~" || input.startsWith("~/") ? path.join(homedir(), input.slice(1)) : input;
}

/** Parses an Expo Orbit deep link such as `expo-orbit:///download?url=…`, the links the "Open with Orbit" buttons use. */
function parseOrbitLink(input: string): LaunchSource {
  // `expo-orbit://download?url=…` (two slashes) is the form Slack and other previews produce.
  const normalized = input.replace(/^([^:]+:\/\/)(auth|update|download|go|snack)/, "$1/$2");
  const url = new URL(normalized.replace(/^[^:]+:\/\//, "https://orbit.invalid"));
  const target = url.searchParams.get("url");
  if (!target) {
    throw new Error("This Expo Orbit link has no url parameter.");
  }
  if (!URL.canParse(target)) {
    throw new Error("This Expo Orbit link doesn't contain a valid URL.");
  }
  if (url.pathname.startsWith("/download")) {
    return { kind: "build", url: target, launchUrl: url.searchParams.get("launchURL") ?? undefined };
  }
  if (url.pathname.startsWith("/update")) {
    return { kind: "update", url: target };
  }
  if (url.pathname.startsWith("/go") || url.pathname.startsWith("/snack")) {
    return { kind: "snack", url: target, sdkVersion: url.searchParams.get("sdkVersion") ?? undefined };
  }
  throw new Error("This Expo Orbit link isn't supported.");
}

function isSnackUrl(url: URL): boolean {
  if (url.searchParams.has("snack")) return true;
  if (url.hostname === "exp.host" && url.pathname.startsWith("/@")) return true;
  const runtimeVersion = url.searchParams.get("runtime-version");
  return Boolean(runtimeVersion?.startsWith("exposdk:") && url.searchParams.has("snack"));
}

/**
 * Works out what an input is, the way Expo Orbit does:
 * - a local `.apk`, `.app`, `.ipa` or `.tar.gz` file
 * - an EAS Build artifact URL, such as `https://expo.dev/artifacts/eas/….apk`
 * - an EAS Update URL, such as `exp://u.expo.dev/…` or `https://u.expo.dev/…`
 * - a Snack URL for Expo Go, such as `exp://exp.host/@snack/…`
 * - an `expo-orbit://` link from an "Open with Orbit" button
 */
export function parseLaunchSource(rawInput: string): LaunchSource {
  const input = rawInput.trim();
  if (!input) {
    throw new Error("Enter a URL or choose a file.");
  }

  if (input.startsWith("/") || input.startsWith("~")) {
    return { kind: "file", path: expandHome(input) };
  }

  let url: URL;
  try {
    url = new URL(input);
  } catch {
    throw new Error("Enter a build, update or Snack URL, or the path of an app file.");
  }

  if (url.protocol === "file:") {
    return { kind: "file", path: decodeURIComponent(url.pathname) };
  }
  if (ORBIT_SCHEMES.includes(url.protocol)) {
    return parseOrbitLink(input);
  }
  if (url.protocol === "exp:" || url.protocol === "exps:") {
    return isSnackUrl(url) ? { kind: "snack", url: input } : { kind: "update", url: input };
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") {
    throw new Error(`Expo Orbit can't open ${url.protocol}// links.`);
  }
  if (url.hostname === "u.expo.dev") {
    return isSnackUrl(url) ? { kind: "snack", url: input } : { kind: "update", url: input };
  }
  if (url.hostname === "snack.expo.dev") {
    throw new Error('Open the Snack\'s "My Device" tab and copy its exp:// link, then paste that link here.');
  }
  if (url.hostname === "expo.dev" && /\/builds\/[^/]+\/?$/.test(url.pathname)) {
    throw new Error("This is a build page. Copy the build's install link (expo.dev/artifacts/…) instead.");
  }
  return { kind: "build", url: input };
}

/** The platform a build or file targets, when the file name tells. */
export function getSourcePlatform(source: LaunchSource): "ios" | "android" | undefined {
  if (source.kind !== "file" && source.kind !== "build") return undefined;
  const target = (source.kind === "file" ? source.path : new URL(source.url).pathname).toLowerCase();
  if (target.endsWith(".apk")) return "android";
  if (target.endsWith(".ipa") || target.endsWith(".app") || target.endsWith(".tar.gz")) return "ios";
  return undefined;
}

export function isAppFile(filePath: string): boolean {
  const lower = filePath.toLowerCase();
  return APP_FILE_EXTENSIONS.some((extension) => lower.endsWith(extension));
}

export function describeSource(source: LaunchSource): string {
  switch (source.kind) {
    case "file":
      return path.basename(source.path);
    case "build":
      return "Build";
    case "update":
      return "Update";
    case "snack":
      return "Snack";
  }
}

export type LaunchProgress = { title: string; message?: string };

const multipleAppsSchema = z.object({
  apps: z.array(
    z.object({
      name: z.string(),
      path: z.string(),
      osType: z.string().optional(),
      deviceType: z.string().optional(),
    }),
  ),
});

/** The CLI reports the apps it found in a tarball with several apps. Picks the one that fits the device. */
async function installAndLaunch(appPath: string, device: Device, launchUrl: string | undefined): Promise<void> {
  const args = ["--app-path", appPath, "--device-id", device.id];
  if (launchUrl) {
    args.push("--launch-url", launchUrl);
  }
  try {
    await runOrbit("install-and-launch", args);
  } catch (error) {
    if (!(error instanceof OrbitError) || error.code !== "MULTIPLE_APPS_IN_TARBALL" || !error.details) {
      throw error;
    }
    const parsed = multipleAppsSchema.safeParse(error.details);
    const wantedType = device.kind === "device" ? "device" : "simulator";
    const app =
      parsed.data?.apps.find(
        (candidate) => candidate.osType === device.osType && candidate.deviceType === wantedType,
      ) ?? parsed.data?.apps.find((candidate) => candidate.deviceType === wantedType);
    if (!app) {
      throw error;
    }
    await installAndLaunch(app.path, device, launchUrl);
  }
}

export type LaunchOptions = {
  audio?: boolean;
  onProgress?: (progress: LaunchProgress) => void;
  /** EAS Update only: open the update with a deep link in the app that's already installed. */
  skipInstall?: boolean;
  /** EAS Update only: open the update in Expo Go. */
  forceExpoGo?: boolean;
};

/** Installs and launches a build, update or Snack on a device, booting it first when needed. */
export async function launchOnDevice(source: LaunchSource, device: Device, options: LaunchOptions = {}): Promise<void> {
  const report = options.onProgress ?? (() => undefined);

  const sourcePlatform = getSourcePlatform(source);
  if (sourcePlatform && sourcePlatform !== device.platform) {
    throw new Error(
      `This build is for ${sourcePlatform === "android" ? "Android" : "Apple"} devices. Choose ${
        sourcePlatform === "android" ? "an Android" : "an iOS"
      } device.`,
    );
  }

  if (source.kind !== "file") {
    await syncTrustedSources();
  }

  if (!device.isRunning) {
    report({ title: `Booting ${device.name}…` });
    await bootDevice(device, { audio: options.audio });
  }

  switch (source.kind) {
    case "file": {
      report({ title: `Installing on ${device.name}…`, message: path.basename(source.path) });
      await installAndLaunch(source.path, device, undefined);
      return;
    }
    case "build": {
      report({ title: "Downloading build…" });
      const appPath = await runOrbit("download-build", [source.url], {
        onOutput: (line) => {
          const progress = parseDownloadProgress(line);
          if (progress !== undefined) {
            report({ title: "Downloading build…", message: `${Math.round(progress)}%` });
          }
        },
      });
      report({ title: `Installing on ${device.name}…` });
      await installAndLaunch(appPath.trim(), device, source.launchUrl);
      return;
    }
    case "update": {
      report({ title: `Opening update on ${device.name}…` });
      const args = [source.url, "-p", device.platform, "--device-id", device.id];
      if (options.skipInstall) args.push("--skip-install");
      if (options.forceExpoGo) args.push("--force-expo-go");
      await runOrbit("launch-update", args, {
        onOutput: (line) => {
          if (line.includes("Downloading app")) {
            const progress = parseDownloadProgress(line);
            report({
              title: "Downloading development build…",
              message: progress === undefined ? undefined : `${Math.round(progress)}%`,
            });
          } else if (line.includes("Installing your app")) {
            report({ title: `Installing on ${device.name}…` });
          } else if (line.includes("Opening url")) {
            report({ title: `Opening update on ${device.name}…` });
          }
        },
      });
      return;
    }
    case "snack": {
      report({ title: `Opening in Expo Go on ${device.name}…` });
      const args = [source.url, "-p", device.platform, "--device-id", device.id];
      if (source.sdkVersion) args.push("--sdk-version", source.sdkVersion);
      await runOrbit("launch-expo-go", args);
      return;
    }
  }
}

/** Builds the `expo-orbit://` link that hands a URL to the Expo Orbit app, like an "Open with Orbit" button. */
export function getOrbitDeepLink(source: Exclude<LaunchSource, { kind: "file" }>, device?: Device): string {
  const route = source.kind === "build" ? "download" : source.kind === "update" ? "update" : "go";
  const params = new URLSearchParams({ url: source.url });
  if (device) params.set("deviceId", device.id);
  if (source.kind === "build" && source.launchUrl) params.set("launchURL", source.launchUrl);
  if (source.kind === "snack" && source.sdkVersion) params.set("sdkVersion", source.sdkVersion);
  return `expo-orbit:///${route}?${params.toString()}`;
}

/** Hands a source to the Expo Orbit app, which shows progress in its menu bar and can resign builds for iPhones. */
export async function openInOrbitApp(source: LaunchSource, device?: Device): Promise<void> {
  const appPath = await getOrbitAppPath();
  if (!appPath) {
    throw new OrbitNotInstalledError();
  }
  if (source.kind === "file") {
    await open(source.path, appPath);
    return;
  }
  await open(getOrbitDeepLink(source, device), appPath);
}
