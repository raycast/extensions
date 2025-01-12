import {
  BrowserExtension,
  getFrontmostApplication,
  showToast as raycastShowToast,
  Toast,
  getPreferenceValues,
  closeMainWindow,
} from "@raycast/api";
import { runAppleScript } from "@raycast/utils";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import * as os from "node:os";
import { v4 as uuidv4 } from "uuid";

// Types
export type CaptureType = "screenshot" | "clipboard" | "selection";
export type BrowserApp = (typeof CONFIG.supportedBrowsers)[number];

export interface CaptureContext {
  app: string | null;
  bundleId: string | null;
  url: string | null;
  window: string | null;
  title: string | null;
}

export interface CapturedData extends Required<Omit<CaptureContext, "title">> {
  id: string;
  type: CaptureType;
  timestamp: string;
  selectedText: string | null;
  screenshotPath: string | null;
  activeViewContent: string | null;
  comment?: string;
  title: string | null;
}

interface TabInfo {
  url: string | null;
  title: string | null;
}

// Configuration
export const CONFIG = {
  directories: {
    captures: getPreferenceValues<{ captureDirectory: string }>().captureDirectory.replace("~", os.homedir()),
    screenshots: getPreferenceValues<{ screenshotsDirectory: string }>().screenshotsDirectory.replace(
      "~",
      os.homedir(),
    ),
  },
  supportedBrowsers: ["Arc", "Brave", "Chrome", "Safari", "Firefox", "Orion"] as const,
} as const;

// Core utilities
export const utils = {
  async ensureDirectory(dir: string): Promise<void> {
    try {
      await fs.mkdir(dir, { recursive: true });
    } catch (error) {
      console.error("Failed to create directory:", { dir, error });
      throw error;
    }
  },

  getTimestampedPath(base: string, name: string, ext: string): string {
    const timestamp = new Date().toISOString().replace(/:/g, "-");
    return path.join(base, `${name}-${timestamp}.${ext}`);
  },

  async saveJSON(filePath: string, data: unknown): Promise<void> {
    await utils.ensureDirectory(path.dirname(filePath));
    await fs.writeFile(filePath, JSON.stringify(data, null, 2));
  },

  async loadCaptures(directory: string) {
    await utils.ensureDirectory(directory);
    const allFiles = await fs.readdir(directory);
    const jsonFiles = allFiles.filter((f) => f.endsWith(".json"));

    const captures = await Promise.all(
      jsonFiles.map(async (f) => {
        const filePath = path.join(directory, f);
        try {
          const data = JSON.parse(await fs.readFile(filePath, "utf-8")) as CapturedData;
          return data.id && data.timestamp && data.type
            ? { path: filePath, data, timestamp: new Date(data.timestamp) }
            : null;
        } catch (error) {
          console.error("Failed to load capture:", { filePath, error });
          return null;
        }
      }),
    );

    return captures
      .filter((c): c is NonNullable<typeof c> => c !== null)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  },

  isImageFile: (f: string) => !f.startsWith(".") && /\.(png|gif|mp4|jpg|jpeg|webp|heic)$/i.test(f),

  getFileUrl: (filePath: string) => `file://${filePath}`,
  stripFileProtocol: (url: string) => url.replace(/^file:\/\//, ""),

  sanitizeTimestamp: (timestamp: string) => timestamp.replace(/:/g, "-"),

  isSupportedBrowser: (appName: string | null): appName is BrowserApp =>
    Boolean(appName && CONFIG.supportedBrowsers.includes(appName as BrowserApp)),

  isValidUrl: (url: string | null | undefined): url is string => {
    if (!url) return false;
    // Filter out special URL schemes and browser-specific URLs
    const invalidSchemes = [
      "mailto:",
      "about:",
      "chrome:",
      "edge:",
      "safari:",
      "firefox:",
      "brave:",
      "file:",
      "tel:",
      "data:",
    ];
    return !invalidSchemes.some((scheme) => url.toLowerCase().startsWith(scheme));
  },

  async getActiveTabInfo(appName: string | null): Promise<TabInfo> {
    if (!utils.isSupportedBrowser(appName)) {
      return { url: null, title: null };
    }

    try {
      const tabs = await BrowserExtension.getTabs();
      const activeTabs = tabs.filter((tab) => tab.active);

      if (activeTabs.length > 1) {
        const script = `tell application "${appName}" to return title of active tab of front window`;
        try {
          const currentTitle = await runAppleScript(script);
          const matchingTab = activeTabs.find((tab) => tab.title === currentTitle);
          if (matchingTab) {
            return {
              url: utils.isValidUrl(matchingTab.url) ? matchingTab.url : null,
              title: matchingTab.title ?? null,
            };
          }
        } catch (error) {
          console.debug("Failed to get current window title:", { error });
        }
      }

      const activeTab = activeTabs[0];
      return {
        url: utils.isValidUrl(activeTab?.url) ? activeTab?.url : null,
        title: activeTab?.title ?? null,
      };
    } catch (error) {
      console.debug("Failed to get tab info:", { browser: appName, error });
      return { url: null, title: null };
    }
  },

  async getActiveTabContent(appName: string | null): Promise<string | null> {
    if (!utils.isSupportedBrowser(appName)) return null;
    try {
      return await BrowserExtension.getContent({ format: "markdown" });
    } catch (error) {
      console.debug("Failed to get tab content:", { browser: appName, error });
      return null;
    }
  },

  async getActiveWindowInfo(): Promise<CaptureContext> {
    const script = `
      tell application "System Events"
        set frontAppProcess to first application process whose frontmost is true
        set frontAppName to name of frontAppProcess
        set bundleID to id of frontAppProcess
        return frontAppName & "|||" & bundleID
      end tell
    `;
    const result = await runAppleScript(script);
    const [appName, bundleId] = result.trim().split("|||");
    const frontMostApp = await getFrontmostApplication();
    const tabInfo = await utils.getActiveTabInfo(appName);

    return {
      app: appName,
      bundleId,
      url: tabInfo.url,
      window: frontMostApp.name,
      title: tabInfo.title,
    };
  },

  async captureScreenshot(saveDir: string, timestamp: string): Promise<string | null> {
    try {
      await utils.ensureDirectory(saveDir);
      const outputPath = path.join(saveDir, `screenshot-${timestamp}.png`);
      await runAppleScript(`do shell script "screencapture -x '${outputPath}'"`);
      return outputPath;
    } catch (error) {
      console.error("Screenshot capture failed:", { error });
      return null;
    }
  },

  getCaptureMetadata(capture: CapturedData): Array<{ label: string; value: string }> {
    const base = [
      { label: "Type", value: capture.type },
      { label: "Timestamp", value: new Date(capture.timestamp).toLocaleString() },
      { label: "App", value: capture.app },
      { label: "Bundle ID", value: capture.bundleId },
      { label: "Window", value: capture.window },
    ];

    return [
      ...base.filter((item): item is { label: string; value: string } => Boolean(item.value)),
      ...(capture.selectedText?.trim() ? [{ label: "Selected Text", value: capture.selectedText.trim() }] : []),
      ...(capture.comment ? [{ label: "Comment", value: capture.comment }] : []),
    ];
  },

  async showToast(options: { style: Toast.Style; title: string; message?: string }): Promise<Toast> {
    return raycastShowToast(options);
  },

  async handleComment(data: CapturedData, filePath: string, comment: string): Promise<void> {
    if (data.type === "screenshot" && filePath.startsWith(CONFIG.directories.screenshots)) {
      const timestamp = new Date().toISOString();
      const imagePath = path.join(CONFIG.directories.captures, `screenshot-${utils.sanitizeTimestamp(timestamp)}.png`);
      const jsonPath = path.join(CONFIG.directories.captures, `screenshot-${utils.sanitizeTimestamp(timestamp)}.json`);

      if (!data.screenshotPath) {
        throw new Error("Screenshot path is missing");
      }

      await utils.ensureDirectory(CONFIG.directories.captures);
      await fs.copyFile(utils.stripFileProtocol(data.screenshotPath), imagePath);

      const captureData: CapturedData = {
        ...data,
        id: path.basename(jsonPath, ".json"),
        timestamp,
        screenshotPath: utils.getFileUrl(imagePath),
        comment,
      };

      await utils.saveJSON(jsonPath, captureData);
    } else {
      const updatedData = { ...data, comment };
      await utils.saveJSON(filePath, updatedData);
    }
  },
};

// Simplified capture function
export async function createCapture(
  type: CaptureType,
  getData: () => Promise<{ selectedText?: string | null; screenshotPath?: string | null }>,
  validate?: (data: { selectedText?: string | null; screenshotPath?: string | null }) => boolean | string,
) {
  try {
    await utils.showToast({ style: Toast.Style.Animated, title: "Capturing context..." });

    // Run getData and getActiveWindowInfo in parallel
    const [data, context] = await Promise.all([getData(), utils.getActiveWindowInfo()]);

    console.debug("Raw capture data:", { data });

    if (validate) {
      const validationResult = validate(data);
      if (validationResult !== true) {
        throw new Error(typeof validationResult === "string" ? validationResult : "Validation failed");
      }
    }

    // Get browser content only if needed
    const browserContent = utils.isSupportedBrowser(context.app) ? await utils.getActiveTabContent(context.app) : null;

    const timestamp = new Date().toISOString();
    const captureData: CapturedData = {
      id: uuidv4(),
      type,
      timestamp,
      selectedText: data.selectedText ?? null,
      screenshotPath: data.screenshotPath ?? null,
      activeViewContent: browserContent,
      ...context,
      title: context.title ?? null,
    };

    // Create file path and save in parallel
    const filePath = utils.getTimestampedPath(CONFIG.directories.captures, type, "json");
    await Promise.all([
      utils.saveJSON(filePath, captureData),
      utils.showToast({ style: Toast.Style.Success, title: "Context Captured", message: "⌘K to add a comment" }),
    ]);

    await closeMainWindow();
    return captureData;
  } catch (error) {
    console.error("Capture failed:", { error });
    await utils.showToast({
      style: Toast.Style.Failure,
      title: "Capture Failed",
      message: String(error),
    });
    throw error;
  }
}
