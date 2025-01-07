import {
  BrowserExtension,
  getFrontmostApplication,
  showToast as raycastShowToast,
  Toast,
  getPreferenceValues,
  closeMainWindow,
  popToRoot,
} from "@raycast/api";
import { runAppleScript } from "@raycast/utils";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import * as os from "node:os";

interface Preferences {
  screenshotsDirectory: string;
  captureDirectory: string;
}

// Configuration
export const CONFIG = {
  saveDir: getPreferenceValues<Preferences>().captureDirectory.replace("~", os.homedir()),
  screenshotsDir: getPreferenceValues<Preferences>().screenshotsDirectory.replace("~", os.homedir()),
  browserApps: ["Arc", "Brave", "Chrome", "Safari", "Firefox", "Orion"] as const,
} as const;

export type BrowserApp = (typeof CONFIG.browserApps)[number];

// Types
export interface CapturedData {
  // Content
  content: {
    text: string | null; // Previously clipboardText
    html: string | null; // Previously browserTabHTML
    screenshot: string | null; // Previously screenshotPath
  };

  // Source info
  source: {
    app: string | null; // Previously activeAppName
    bundleId: string | null; // Previously activeAppBundleId
    url: string | null; // Previously activeURL
    window: string | null; // Previously frontAppName
  };

  // Metadata
  metadata: {
    timestamp: string;
    comment?: string;
  };

  // Legacy fields for backward compatibility
  timestamp?: string;
  comment?: string;
  clipboardText?: string | null;
  browserTabHTML?: string | null;
  screenshotPath?: string | null;
  activeAppName?: string | null;
  activeAppBundleId?: string | null;
  activeURL?: string | null;
  frontAppName?: string | null;
}

// Services
export const FileService = {
  async ensureDirectory(dir: string) {
    await fs.mkdir(dir, { recursive: true });
  },

  async saveJSON(filePath: string, data: unknown) {
    await fs.writeFile(filePath, JSON.stringify(data, null, 2));
  },

  getTimestampedPath(base: string, name: string, ext: string) {
    const timestamp = new Date().toISOString().replace(/:/g, "-");
    return path.join(base, `${name}-${timestamp}.${ext}`);
  },

  async captureScreenshot(saveDir: string, timestamp: string): Promise<string | null> {
    try {
      const outputPath = path.join(saveDir, `screenshot-${timestamp}.png`);
      const script = `do shell script "screencapture -x '${outputPath}'"`;
      await runAppleScript(script);

      try {
        await fs.access(outputPath);
        return outputPath;
      } catch {
        return null;
      }
    } catch (error) {
      console.error("Screenshot capture failed:", error);
      return null;
    }
  },

  async captureAreaScreenshot(saveDir: string, timestamp: string): Promise<string | null> {
    try {
      const outputPath = path.join(saveDir, `screenshot-${timestamp}.png`);
      // -i for interactive (area selection), -s for silent mode
      const script = `do shell script "screencapture -i -s '${outputPath}'"`;
      await runAppleScript(script);

      try {
        await fs.access(outputPath);
        return outputPath;
      } catch {
        return null;
      }
    } catch (error) {
      console.error("Area screenshot capture failed:", error);
      return null;
    }
  },
};

export const WindowService = {
  async getActiveAppInfo() {
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
    return { appName, bundleId };
  },
};

export const BrowserService = {
  async getActiveTabURL(appName: string | null) {
    if (!appName || !CONFIG.browserApps.includes(appName as BrowserApp)) return null;

    try {
      console.debug("Getting tabs for browser:", appName);
      const tabs = await BrowserExtension.getTabs();
      console.debug("Got tabs:", JSON.stringify(tabs, null, 2));

      // Get all active tabs
      const activeTabs = tabs.filter((tab) => tab.active);
      console.debug("Active tabs:", activeTabs);

      // If multiple active tabs, try to match with the current window title
      if (activeTabs.length > 1) {
        const script = `
          tell application "${appName}"
            return title of active tab of front window
          end tell
        `;
        try {
          const currentTitle = await runAppleScript(script);
          console.debug("Current window title:", currentTitle);
          const matchingTab = activeTabs.find((tab) => tab.title === currentTitle);
          if (matchingTab) return matchingTab.url;
        } catch (error) {
          console.debug("Failed to get current window title:", error);
        }
      }

      // Fallback to first active tab if we couldn't match by title
      return activeTabs[0]?.url ?? null;
    } catch (error) {
      console.debug(`Failed to get URL for ${appName}:`, error);
      return null;
    }
  },

  async getActiveTabHTML(appName: string | null): Promise<string | null> {
    if (!appName || !CONFIG.browserApps.includes(appName as BrowserApp)) return null;

    try {
      const content = await BrowserExtension.getContent({ format: "markdown" });
      if (content) {
        console.debug("Got content length:", content.length);
      }
      return content;
    } catch (error) {
      // Silently handle content capture failures (PDFs, etc)
      console.debug(`Content capture not available for ${appName}`);
      return null;
    }
  },
};

export const ToastService = {
  async showCapturing() {
    return raycastShowToast({ style: Toast.Style.Animated, title: "Capturing context..." });
  },

  async showSuccess(message?: string) {
    return raycastShowToast({
      style: Toast.Style.Success,
      title: "Context Captured",
      message: message ?? "⌘K to add a comment",
    });
  },

  async showError(error: unknown) {
    console.error("Capture failed:", error);
    return raycastShowToast({
      style: Toast.Style.Failure,
      title: "Capture Failed",
      message: String(error),
    });
  },
};

export const CaptureService = {
  async gatherContext() {
    const { appName, bundleId } = await WindowService.getActiveAppInfo();
    const frontMostApp = await getFrontmostApplication();
    const frontAppName = frontMostApp.name;
    const activeURL = await BrowserService.getActiveTabURL(appName);
    const browserTabHTML = await BrowserService.getActiveTabHTML(appName);

    return {
      appName,
      bundleId,
      frontAppName,
      activeURL,
      browserTabHTML,
    };
  },

  async createCaptureData({
    text = null,
    html = null,
    screenshot = null,
    timestamp = new Date().toISOString(),
  }: {
    text?: string | null;
    html?: string | null;
    screenshot?: string | null;
    timestamp?: string;
  }): Promise<CapturedData> {
    const context = await this.gatherContext();

    return {
      content: {
        text,
        html: html ?? context.browserTabHTML,
        screenshot,
      },
      source: {
        app: context.appName,
        bundleId: context.bundleId,
        url: context.activeURL,
        window: context.frontAppName,
      },
      metadata: {
        timestamp,
      },
    };
  },

  async capture<T>({
    type,
    getData,
    validate,
  }: {
    type: string;
    getData: () => Promise<T>;
    validate?: (data: T) => boolean | string;
  }) {
    try {
      await ToastService.showCapturing();

      // Get data
      const data = await getData();

      // Validate if needed
      if (validate) {
        const validationResult = validate(data);
        if (validationResult !== true) {
          throw new Error(typeof validationResult === "string" ? validationResult : "Validation failed");
        }
      }

      // Ensure directory exists
      await FileService.ensureDirectory(CONFIG.saveDir);

      // Create capture data
      const timestamp = new Date().toISOString();
      const captureData = await this.createCaptureData({
        ...(typeof data === "string" ? { text: data } : data),
        timestamp,
      });

      // Save to file
      const jsonPath = FileService.getTimestampedPath(CONFIG.saveDir, `${type}-capture`, "json");
      await FileService.saveJSON(jsonPath, captureData);

      await ToastService.showSuccess();
      await closeMainWindow();
      await popToRoot();
    } catch (error) {
      await ToastService.showError(error);
    }
  },
};
