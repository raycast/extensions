import { Clipboard, getPreferenceValues, Keyboard, showInFinder, showToast, Toast } from "@raycast/api";
import { runAppleScript, showFailureToast } from "@raycast/utils";
import { execFile } from "child_process";
import { existsSync, mkdirSync } from "fs";
import { homedir } from "os";
import { join } from "path";
import { promisify } from "util";
import {
  DESIRED_RAYCAST_WIDTH_IN_METADATA_PX,
  METADATA_HEIGHT_PX,
  METADATA_PADDING_X_PX,
  METADATA_PADDING_Y_PX,
  METADATA_WIDTH_PX,
  RAYCAST_WINDOW_HEIGHT,
  RAYCAST_WINDOW_WIDTH,
} from "./constants";
import { buildFilePath, findDevelopedExtension } from "./destination";
import { captureOnWallpaper } from "./wallpaper";

const execFileAsync = promisify(execFile);

export type WindowFrame = { x: number; y: number; w: number; h: number };

export type CaptureResult = {
  path: string;
  /** Pixel size of the written image, or undefined when it could not be read (PDF). */
  pixels?: { w: number; h: number };
  /** Set when the screenshot went to a development extension's metadata folder. */
  extensionName?: string;
};

const ASPECT_TOLERANCE = 0.01;

const tildify = (path: string) => path.replace(homedir(), "~");

export const errorMessage = (error: unknown) => tildify(error instanceof Error ? error.message : String(error));

/** Downloads when the preference is empty; a chosen folder that no longer exists is an error. */
export function getScreenshotsDirectory(): string {
  const { screenshotsDirectory } = getPreferenceValues<Preferences>();
  // Not trimmed: a folder name can legitimately end in a space.
  const expanded = (screenshotsDirectory ?? "").replace(/^~(?=$|\/)/, homedir()).replace(/(.)\/+$/, "$1");
  if (!expanded.trim()) return join(homedir(), "Downloads");
  if (!existsSync(expanded)) {
    throw new Error(`Default Save Location ${tildify(expanded)} doesn't exist. Choose another in preferences.`);
  }
  return expanded;
}

/**
 * Finds Raycast's main window among all of its windows (Settings, AI Chat and others can be open
 * at the same time), matching on the main window's fixed aspect ratio.
 */
export async function findRaycastMainWindow(): Promise<WindowFrame | undefined> {
  const output = await runAppleScript(`
tell application "System Events"
  tell process "Raycast"
    set out to ""
    repeat with w in windows
      set p to position of w
      set s to size of w
      set out to out & (item 1 of p) & "," & (item 2 of p) & "," & (item 1 of s) & "," & (item 2 of s) & linefeed
    end repeat
    return out
  end tell
end tell`);
  const target = RAYCAST_WINDOW_HEIGHT / RAYCAST_WINDOW_WIDTH;
  return output
    .split("\n")
    .map((line) => line.split(",").map(Number))
    .filter((parts) => parts.length === 4 && parts.every(Number.isFinite))
    .map(([x, y, w, h]) => ({ x, y, w, h }))
    .find(({ w, h }) => w > 0 && Math.abs(h / w - target) / target < ASPECT_TOLERANCE);
}

async function readPixelSize(path: string): Promise<{ w: number; h: number } | undefined> {
  try {
    const { stdout } = await execFileAsync("/usr/bin/sips", ["-g", "pixelWidth", "-g", "pixelHeight", path]);
    const w = Number(/pixelWidth:\s*(\d+)/.exec(stdout)?.[1]);
    const h = Number(/pixelHeight:\s*(\d+)/.exec(stdout)?.[1]);
    return w && h ? { w, h } : undefined;
  } catch {
    return undefined;
  }
}

export async function captureRaycastMetadata(frame: WindowFrame): Promise<CaptureResult> {
  const { fileNameFormat, screenshotFormat, saveToDevelopedExtension, customWallpaper } =
    getPreferenceValues<Preferences>();
  const developed = saveToDevelopedExtension ? await findDevelopedExtension() : undefined;
  // The Store only takes PNG, so an extension's metadata folder always gets one; the format
  // preference applies to the Default Save Location.
  const format = developed ? "png" : screenshotFormat;
  if (customWallpaper && format === "pdf") {
    throw new Error("Custom Wallpaper works with PNG, JPEG and TIFF. Choose one of those as the Screenshot Format.");
  }
  let directory: string;
  if (developed) {
    directory = join(developed.root, "metadata");
    mkdirSync(directory, { recursive: true });
  } else {
    directory = getScreenshotsDirectory();
  }
  const path = buildFilePath(directory, fileNameFormat, format, developed?.name);

  if (customWallpaper) {
    // Composited at exactly 2000 × 1250 px, whatever the display's scale.
    await captureOnWallpaper(frame, customWallpaper, path, format as "png" | "jpg" | "tiff", {
      width: METADATA_WIDTH_PX,
      height: METADATA_HEIGHT_PX,
      paddingX: METADATA_PADDING_X_PX,
      paddingY: METADATA_PADDING_Y_PX,
    });
  } else {
    // The window is captured with padding around it, in points; screencapture writes at the
    // display's backing scale, so a Retina display yields 2000 × 1250 px.
    const scale = DESIRED_RAYCAST_WIDTH_IN_METADATA_PX / frame.w;
    const region = [
      frame.x - METADATA_PADDING_X_PX / scale,
      frame.y - METADATA_PADDING_Y_PX / scale,
      METADATA_WIDTH_PX / scale,
      METADATA_HEIGHT_PX / scale,
    ].join(",");
    await execFileAsync("/usr/sbin/screencapture", ["-x", "-t", format, "-R", region, path]);
  }
  if (!existsSync(path)) {
    throw new Error(`screencapture exited without writing ${path}`);
  }
  return { path, extensionName: developed?.name, pixels: format === "pdf" ? undefined : await readPixelSize(path) };
}

export async function showFailure(title: string, message: string) {
  await showFailureToast(message, {
    title,
    primaryAction: { title: "Copy Error", onAction: () => Clipboard.copy(message) },
  });
}

export async function showCaptureResult({ path, pixels, extensionName }: CaptureResult) {
  const fileActions: { primaryAction: Toast.ActionOptions; secondaryAction: Toast.ActionOptions } = {
    primaryAction: {
      title: "Show in Finder",
      shortcut: { modifiers: ["cmd"], key: "o" },
      onAction: () => showInFinder(path),
    },
    secondaryAction: {
      title: "Copy Path",
      shortcut: Keyboard.Shortcut.Common.CopyPath,
      onAction: async (toast: Toast) => {
        await Clipboard.copy(path);
        toast.message = "Path copied to clipboard";
      },
    },
  };

  if (pixels && (pixels.w !== METADATA_WIDTH_PX || pixels.h !== METADATA_HEIGHT_PX)) {
    // The file was written but the Store will reject it; say so instead of reporting success.
    const message = `${pixels.w} × ${pixels.h} px, the Store requires ${METADATA_WIDTH_PX} × ${METADATA_HEIGHT_PX}. ${tildify(path)}`;
    await showToast({
      style: Toast.Style.Failure,
      title: "Saved at the Wrong Size",
      message,
      primaryAction: { title: "Copy Error", onAction: () => Clipboard.copy(message) },
      secondaryAction: fileActions.primaryAction,
    });
    return;
  }

  await showToast({
    style: Toast.Style.Success,
    // Name the extension: it was chosen from running dev servers, not from what Raycast shows.
    title: extensionName ? `Saved to ${extensionName} Metadata` : "Screenshot Saved",
    // PDFs, or an image sips cannot read, have no verified size: say so rather than imply it passed.
    message: pixels ? tildify(path) : `${tildify(path)} (size not checked)`,
    ...fileActions,
  });
}
