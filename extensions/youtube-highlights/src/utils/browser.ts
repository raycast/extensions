import { getFrontmostApplication, getPreferenceValues, LocalStorage } from "@raycast/api";
import { spawn } from "child_process";
import { createLogger } from "./logger";

const logger = createLogger("BrowserUtils");

export interface VideoMetadata {
  title: string;
  url: string;
  currentTime: number;
  duration: number;
  isPlaying: boolean;
  browser: string;
  videoType: "video" | "short" | "live" | "ad";
  isMiniplayer: boolean;
  status?: "ok" | "fallback" | "no_video";
}

export interface BrowserPrefs {
  checkArc: boolean;
  checkChrome: boolean;
  checkBrave: boolean;
  checkSafari: boolean;
  checkEdge: boolean;
  checkFirefox: boolean;
}

export const DEFAULT_BROWSER_PREFS: BrowserPrefs = {
  checkArc: true,
  checkChrome: false,
  checkBrave: false,
  checkSafari: false,
  checkEdge: false,
  checkFirefox: false,
};

interface BrowserAdapter {
  readonly name: string;
  readonly preferenceKey: keyof BrowserPrefs;
  getForegroundVideo(): Promise<VideoMetadata | null>;
  getBackgroundPlayingVideo?: () => Promise<VideoMetadata | null>;
}

interface JxaOptions {
  timeout?: number;
}

async function executeJxa<T>(script: string, options: JxaOptions = {}): Promise<T | null> {
  const { timeout = 1000 } = options;
  const controller = new AbortController();
  const { signal } = controller;

  let capturedStdout = "";
  let capturedStderr = "";

  const timeoutPromise = new Promise<never>((_, reject) => {
    const id = setTimeout(() => {
      controller.abort();
      reject(new Error(`JXA execution timed out after ${timeout}ms`));
    }, timeout);
    signal.addEventListener("abort", () => clearTimeout(id));
  });

  const runScript = new Promise<{ stdout: string; stderr: string }>((resolve, reject) => {
    const child = spawn("osascript", ["-l", "JavaScript", "-"], { signal });

    child.stdout.on("data", (data) => {
      capturedStdout += data.toString();
    });

    child.stderr.on("data", (data) => {
      const chunk = data.toString();
      capturedStderr += chunk;
      logger.debug("[JXA stderr]", chunk);
    });

    child.on("error", (error) => {
      if (error.name === "AbortError") return;
      reject(error);
    });

    child.on("close", (code) => {
      if (signal.aborted) {
        reject(new Error("Aborted"));
        return;
      }
      if (code === 0) {
        resolve({ stdout: capturedStdout, stderr: capturedStderr });
      } else {
        reject(new Error(`Exit code ${code}: ${capturedStderr}`));
      }
    });

    child.stdin.write(script);
    child.stdin.end();
  });

  try {
    logger.debug(`Executing JXA (timeout: ${timeout}ms)`);

    const result = await Promise.race([runScript, timeoutPromise]);

    const trimmed = result.stdout.trim();

    if (!trimmed) return null;

    let parsed = JSON.parse(trimmed);
    if (typeof parsed === "string") {
      try {
        parsed = JSON.parse(parsed);
      } catch {
        // Already parsed as much as possible
      }
    }
    return parsed;
  } catch (error) {
    if (capturedStderr) {
      logger.debug("[JXA stderr on error/timeout]", capturedStderr);
    }

    if (error instanceof Error && (error.name === "AbortError" || error.message.includes("timed out"))) {
      logger.error(`[JXA Timeout] ${timeout}ms exceeded.`);
    } else {
      logger.error("[JXA Error]", error);
    }
    return null;
  }
}

function resolveEnvPref(envKey: string, userValue: boolean | undefined, defaultValue: boolean): boolean {
  if (process.env[envKey] === "true") return true;
  if (process.env[envKey] === "false") return false;
  return userValue ?? defaultValue;
}

export function getBrowserPrefs(): BrowserPrefs {
  const userPrefs = getPreferenceValues<Partial<BrowserPrefs>>();

  return {
    checkArc: resolveEnvPref("CHECK_ARC", userPrefs.checkArc, DEFAULT_BROWSER_PREFS.checkArc),
    checkChrome: resolveEnvPref("CHECK_CHROME", userPrefs.checkChrome, DEFAULT_BROWSER_PREFS.checkChrome),
    checkBrave: resolveEnvPref("CHECK_BRAVE", userPrefs.checkBrave, DEFAULT_BROWSER_PREFS.checkBrave),
    checkSafari: resolveEnvPref("CHECK_SAFARI", userPrefs.checkSafari, DEFAULT_BROWSER_PREFS.checkSafari),
    checkEdge: resolveEnvPref("CHECK_EDGE", userPrefs.checkEdge, DEFAULT_BROWSER_PREFS.checkEdge),
    checkFirefox: resolveEnvPref("CHECK_FIREFOX", userPrefs.checkFirefox, DEFAULT_BROWSER_PREFS.checkFirefox),
  };
}

const EXTRACTION_SCRIPT = `
  try {
    var video = document.querySelector('video');
    if (!video) return JSON.stringify({ error: 'NO_VIDEO' });
    
    var title = document.title;
    var url = window.location.href;
    var currentTime = video.currentTime;
    var duration = video.duration;
    var paused = video.paused;
    var isMiniplayer = !!document.querySelector('.ytd-miniplayer');
    var videoType = 'video';
    
    if (url.includes('/shorts/')) videoType = 'short';
    if (document.querySelector('.ad-showing') || document.querySelector('.video-ads')) videoType = 'ad';
    
    return JSON.stringify({
      title: title,
      url: url,
      currentTime: currentTime,
      duration: duration,
      isPlaying: !paused,
      browser: 'Arc',
      videoType: videoType,
      isMiniplayer: isMiniplayer,
      status: 'ok'
    });
  } catch(e) {
    return JSON.stringify({ error: 'EXTRACTION_ERROR', message: e.toString(), stack: e.stack });
  }
`;

class ArcAdapter implements BrowserAdapter {
  readonly name = "Arc";
  readonly preferenceKey = "checkArc";

  async getForegroundVideo(): Promise<VideoMetadata | null> {
    logger.debug("ArcAdapter: Checking foreground video");

    const escapedScript = EXTRACTION_SCRIPT.replace(/"/g, '\\"').replace(/\n/g, " ");
    const combinedScript = `
      try {
        var arc = Application("Arc");
        if (!arc.running() || arc.windows.length === 0) {
          JSON.stringify({ error: "NO_WINDOWS" });
        } else {
          var win = arc.windows[0];
          var tab = win.activeTab;
          var url = tab.url();
          var title = tab.title();
          
          if (!url || (!url.includes("youtube.com/watch") && !url.includes("youtube.com/shorts"))) {
            JSON.stringify({ skip: true });
          } else {
            var result = tab.execute({ javascript: "${escapedScript}" });
            result;
          }
        }
      } catch (e) {
        JSON.stringify({ error: "JXA_ERROR", message: e.toString() });
      }
    `;

    const result = await executeJxa<
      (VideoMetadata & { error?: string; skip?: boolean }) | { url: string; title: string }
    >(combinedScript, { timeout: 1000 });

    logger.debug("ArcAdapter: Combined check result", result);

    if (!result || ("skip" in result && result.skip)) {
      return null;
    }

    if ("error" in result) {
      if (result.error === "NO_VIDEO") {
        logger.warn("ArcAdapter: YouTube tab found but no video element");
        return {
          title: "Unknown Title",
          url: "",
          currentTime: 0,
          duration: 0,
          isPlaying: false,
          browser: "Arc",
          videoType: "video",
          isMiniplayer: false,
          status: "no_video",
        };
      }
      logger.warn("ArcAdapter: JXA error", result);
      return null;
    }

    if (!result || result === ("null" as unknown as typeof result) || !("title" in result) || !result.title) {
      logger.warn("ArcAdapter: Extraction failed or missing title, using fallback", result);
      return {
        title: "Unknown Title",
        url: "",
        currentTime: 0,
        duration: 0,
        isPlaying: false,
        browser: "Arc",
        videoType: "video",
        isMiniplayer: false,
        status: "fallback",
      };
    }

    logger.info("ArcAdapter: Found foreground video", { title: result.title });
    return result as VideoMetadata;
  }

  async getBackgroundPlayingVideo(): Promise<VideoMetadata | null> {
    const timeout = 30000;

    const lastPlaying = await LocalStorage.getItem<string>("last_playing_tab");
    let lastPlayingInfo = null;

    if (lastPlaying) {
      try {
        lastPlayingInfo = JSON.parse(lastPlaying);
      } catch (e) {
        logger.warn("ArcAdapter: Corrupted last_playing_tab cache, clearing", { error: e });
        await LocalStorage.removeItem("last_playing_tab");
      }
    }

    logger.debug("ArcAdapter: Scanning for background playing video", { timeout, lastPlayingInfo });

    const script = `
      (function() {
        var app = Application("Arc");
        if (!app.running()) return JSON.stringify({ error: "Arc not running" });

        function probeTab(tab, tabIndex, winIndex, source) {
          try {
            var url = tab.url();
            if (!url.includes("youtube.com/watch") && !url.includes("youtube.com/shorts")) {
              return null;
            }

            var isPlaying = false;
            try {
              isPlaying = tab.execute({ javascript: \`
                (function() {
                  var v = document.querySelector('video');
                  return v && !v.paused && v.readyState >= 2 && v.duration > 0;
                })()
              \` });
            } catch(e) {
              return null;
            }

            if (isPlaying === true || isPlaying === "true") {
              var extractCode = ${JSON.stringify(EXTRACTION_SCRIPT)};
              var result = tab.execute({ javascript: "(function() { " + extractCode + " })()" });
              
              if (result && result !== "null") {
                var parsed = JSON.parse(result);
                parsed.tabId = tab.id();
                parsed.windowId = app.windows[winIndex].id();
                parsed.source = source;
                return parsed;
              }
            }
          } catch(e) {}
          return null;
        }

        var windows = app.windows;
        var checkedTabIds = {};
        
        for (var i = 0; i < windows.length; i++) {
          try {
            var activeTab = windows[i].activeTab;
            var id = activeTab.id();
            checkedTabIds[id] = true;
            
            var result = probeTab(activeTab, -1, i, "active_tab");
            if (result) return JSON.stringify(result);
          } catch(e) {}
        }

        var cachedInfo = ${lastPlayingInfo ? JSON.stringify(lastPlayingInfo) : "null"};
        if (cachedInfo && cachedInfo.windowId && cachedInfo.tabId && !checkedTabIds[cachedInfo.tabId]) {
          try {
            var win = app.windows.byId(cachedInfo.windowId);
            if (win) {
              var tab = win.tabs.byId(cachedInfo.tabId);
              if (tab) {
                checkedTabIds[cachedInfo.tabId] = true;
                var result = probeTab(tab, -1, -1, "cache_hit");
                if (result) return JSON.stringify(result);
              }
            }
          } catch(e) {}
        }

        for (var i = 0; i < windows.length; i++) {
          try {
            var win = windows[i];
            var youtubeTabs = win.tabs.whose({ url: { _contains: "youtube.com" } });
            
            var tabCount = 0;
            try { tabCount = youtubeTabs.length; } catch(e) { continue; }
            
            if (tabCount > 0) {
              var tabs;
              try { tabs = youtubeTabs(); } catch(e) { continue; }
              
              for (var j = 0; j < tabs.length; j++) {
                var tab = tabs[j];
                var id = tab.id();
                
                if (checkedTabIds[id]) continue;
                
                var result = probeTab(tab, j, i, "background_scan");
                if (result) return JSON.stringify(result);
              }
            }
          } catch(e) {}
        }
        
        return JSON.stringify({ found: false });
      })();
    `;

    const result = await executeJxa<
      (VideoMetadata & { tabId?: string; windowId?: number; source?: string }) | { found: boolean; error?: string }
    >(script, { timeout });

    if (result && typeof result === "object" && "title" in result) {
      logger.info("ArcAdapter: Found background playing video", { title: result.title, source: result.source });

      if (result.tabId && result.windowId) {
        await LocalStorage.setItem(
          "last_playing_tab",
          JSON.stringify({
            tabId: result.tabId,
            windowId: result.windowId,
            title: result.title,
            timestamp: Date.now(),
          }),
        );
      }

      if (!result.status) result.status = "ok";
      return result as VideoMetadata;
    }

    if (result && typeof result === "object" && "error" in result) {
      logger.error("ArcAdapter: Background scan error:", result.error);
    }

    return null;
  }
}

const adapters: BrowserAdapter[] = [new ArcAdapter()];

export async function getYouTubeMetadata(): Promise<VideoMetadata[]> {
  const prefs = getBrowserPrefs();
  logger.info("Starting YouTube metadata fetch", { prefs });

  try {
    const frontmost = await getFrontmostApplication();
    logger.debug(`Frontmost app: ${frontmost.name}`);

    const frontmostAdapter = adapters.find((a) => a.name === frontmost.name);

    if (frontmostAdapter && prefs[frontmostAdapter.preferenceKey]) {
      logger.info(`Checking foreground: ${frontmostAdapter.name}`);
      const video = await frontmostAdapter.getForegroundVideo();
      if (video) return [video];
    }
  } catch (e) {
    logger.error("Error checking frontmost application:", e);
  }

  const enabledAdapters = adapters.filter((a) => prefs[a.preferenceKey]);
  logger.info(`Checking background playing videos: ${enabledAdapters.map((a) => a.name).join(", ")}`);

  const results = await Promise.all(
    enabledAdapters.map(async (adapter) => {
      try {
        if (adapter.getBackgroundPlayingVideo) {
          return await adapter.getBackgroundPlayingVideo();
        }
        return null;
      } catch (e) {
        logger.error(`Error scanning background for ${adapter.name}:`, e);
        return null;
      }
    }),
  );

  const foundVideo = results.find((v) => v !== null);
  if (foundVideo) {
    return [foundVideo];
  }

  return [];
}
