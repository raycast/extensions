import { runAppleScript } from "@raycast/utils";

export type BrowserType = "Google Chrome" | "Arc" | "Brave Browser" | "Safari" | "Dia";

export interface MediaInfo {
  title: string;
  url: string;
  isPlaying: boolean;
  currentTime?: number;
  duration?: number;
  browser: BrowserType;
  tabIndex?: number;
}

// Note: Dia doesn't support AppleScript automation yet (as of 2025)
const CHROMIUM_BROWSERS: BrowserType[] = ["Google Chrome", "Arc", "Brave Browser"];

/**
 * Find all YouTube tabs across supported browsers
 */
export async function findYouTubeTabs(): Promise<MediaInfo[]> {
  const tabs: MediaInfo[] = [];

  for (const browser of CHROMIUM_BROWSERS) {
    try {
      const browserTabs = await findYouTubeTabsInChromiumBrowser(browser);
      tabs.push(...browserTabs);
    } catch (error) {
      // Browser not installed or not running, skip it
      console.log(`${browser} not available:`, error);
    }
  }

  // Check Safari separately
  try {
    const safariTabs = await findYouTubeTabsInSafari();
    tabs.push(...safariTabs);
  } catch (error) {
    console.log("Safari not available:", error);
  }

  return tabs;
}

/**
 * Find YouTube tabs in Chromium-based browsers (Chrome, Arc, Brave, Dia)
 */
async function findYouTubeTabsInChromiumBrowser(browser: BrowserType): Promise<MediaInfo[]> {
  const script = `
    tell application "${browser}"
      if not running then return "[]"
      
      set output to "["
      set firstItem to true
      
      repeat with w in windows
        repeat with t in tabs of w
          set tabURL to URL of t
          if tabURL contains "youtube.com/watch" then
            set tabTitle to title of t
            
            -- Escape quotes in title and URL
            set tabTitle to my replaceText(tabTitle, "\\"", "\\\\\\"")
            set tabURL to my replaceText(tabURL, "\\"", "\\\\\\"")
            
            if not firstItem then
              set output to output & ","
            end if
            set firstItem to false
            
            set output to output & "{\\"title\\":\\"" & tabTitle & "\\",\\"url\\":\\"" & tabURL & "\\"}"
          end if
        end repeat
      end repeat
      
      set output to output & "]"
      return output
    end tell
    
    on replaceText(theText, searchString, replacementString)
      set AppleScript's text item delimiters to searchString
      set theTextItems to every text item of theText
      set AppleScript's text item delimiters to replacementString
      set theText to theTextItems as string
      set AppleScript's text item delimiters to ""
      return theText
    end replaceText
  `;

  try {
    const result = await runAppleScript(script);

    if (result === "[]" || result === "") {
      return [];
    }

    // Parse the JSON result
    const parsed = JSON.parse(result);

    return parsed.map((item: { title: string; url: string }) => ({
      title: item.title,
      url: item.url,
      isPlaying: false,
      browser,
    }));
  } catch (error) {
    console.error(`Error finding tabs in ${browser}:`, error);
    return [];
  }
}

/**
 * Find YouTube tabs in Safari
 */
async function findYouTubeTabsInSafari(): Promise<MediaInfo[]> {
  const script = `
    tell application "Safari"
      if not running then return "[]"
      
      set tabsList to {}
      repeat with w in windows
        repeat with t in tabs of w
          set tabURL to URL of t
          if tabURL contains "youtube.com/watch" then
            set tabTitle to name of t
            set end of tabsList to {title:tabTitle, url:tabURL}
          end if
        end repeat
      end repeat
      
      return tabsList
    end tell
  `;

  try {
    const result = await runAppleScript(script);

    if (result === "[]" || result === "") {
      return [];
    }

    const tabs: MediaInfo[] = [];
    const matches = result.matchAll(/\{title:"([^"]*)", url:"([^"]*)"\}/g);

    for (const match of matches) {
      tabs.push({
        title: match[1],
        url: match[2],
        isPlaying: false,
        browser: "Safari",
      });
    }

    return tabs;
  } catch (error) {
    console.error("Error finding tabs in Safari:", error);
    return [];
  }
}

/**
 * Execute JavaScript in a specific YouTube tab by URL
 * This is exported so other commands can use it directly
 */
export async function executeInYouTubeTab(browser: BrowserType, jsCode: string, targetUrl?: string): Promise<string> {
  if (CHROMIUM_BROWSERS.includes(browser)) {
    return executeInChromiumBrowser(browser, jsCode, targetUrl);
  } else if (browser === "Safari") {
    return executeInSafari(jsCode, targetUrl);
  }

  throw new Error(`Unsupported browser: ${browser}`);
}

/**
 * Execute JavaScript in Chromium-based browser (optionally targeting specific tab by URL)
 */
async function executeInChromiumBrowser(browser: BrowserType, jsCode: string, targetUrl?: string): Promise<string> {
  // Escape the JavaScript code for AppleScript
  const escapedJS = jsCode.replace(/\\/g, "\\\\").replace(/"/g, '\\"');

  const script = targetUrl
    ? `
      tell application "${browser}"
        if not running then return ""
        
        set windowIndex to 1
        repeat with w in windows
          set tabIndex to 1
          repeat with t in tabs of w
            if URL of t is "${targetUrl}" then
              -- Execute JavaScript directly (works even when minimized)
              set jsResult to execute tab tabIndex of window windowIndex javascript "${escapedJS}"
              return jsResult
            end if
            set tabIndex to tabIndex + 1
          end repeat
          set windowIndex to windowIndex + 1
        end repeat
        
        return ""
      end tell
    `
    : `
      tell application "${browser}"
        if not running then return ""
        
        -- Find the first YouTube tab in any window (including minimized)
        set windowIndex to 1
        repeat with w in windows
          set tabIndex to 1
          repeat with t in tabs of w
            if URL of t contains "youtube.com/watch" then
              -- Execute JavaScript on this tab
              set jsResult to execute tab tabIndex of window windowIndex javascript "${escapedJS}"
              return jsResult
            end if
            set tabIndex to tabIndex + 1
          end repeat
          set windowIndex to windowIndex + 1
        end repeat
        
        return ""
      end tell
    `;

  try {
    const result = await runAppleScript(script);
    return result;
  } catch (error) {
    console.error(`Error executing JS in ${browser}:`, error);
    throw error;
  }
}

/**
 * Execute JavaScript in Safari (optionally targeting specific tab by URL)
 */
async function executeInSafari(jsCode: string, targetUrl?: string): Promise<string> {
  const escapedJS = jsCode.replace(/\\/g, "\\\\").replace(/"/g, '\\"');

  const script = targetUrl
    ? `
      tell application "Safari"
        if not running then return ""
        
        set windowIndex to 1
        repeat with w in windows
          set tabIndex to 1
          repeat with t in tabs of w
            if URL of t is "${targetUrl}" then
              -- Execute JavaScript directly
              set jsResult to do JavaScript "${escapedJS}" in tab tabIndex of window windowIndex
              return jsResult
            end if
            set tabIndex to tabIndex + 1
          end repeat
          set windowIndex to windowIndex + 1
        end repeat
        
        return ""
      end tell
    `
    : `
      tell application "Safari"
        if not running then return ""
        
        -- Find the first YouTube tab in any window (including minimized)
        set windowIndex to 1
        repeat with w in windows
          set tabIndex to 1
          repeat with t in tabs of w
            if URL of t contains "youtube.com/watch" then
              -- Execute JavaScript on this tab
              set jsResult to do JavaScript "${escapedJS}" in tab tabIndex of window windowIndex
              return jsResult
            end if
            set tabIndex to tabIndex + 1
          end repeat
          set windowIndex to windowIndex + 1
        end repeat
        
        return ""
      end tell
    `;

  try {
    const result = await runAppleScript(script);
    return result;
  } catch (error) {
    console.error("Error executing JS in Safari:", error);
    throw error;
  }
}

/**
 * Toggle play/pause on YouTube
 */
export async function togglePlayPause(browser: BrowserType, targetUrl?: string): Promise<string> {
  const jsCode = `
    (function() {
      const video = document.querySelector('video');
      if (video) {
        const wasPaused = video.paused;
        
        if (wasPaused) {
          // Video is paused - try to play it
          const playPromise = video.play();
          
          // Check if play() was blocked immediately
          if (video.paused) {
            return 'failed-to-play';
          } else {
            return 'playing';
          }
        } else {
          // Video is playing - pause it
          video.pause();
          return 'paused';
        }
      }
      return 'no-video';
    })();
  `;

  const result = await executeInYouTubeTab(browser, jsCode, targetUrl);
  return result;
}

/**
 * Get current playback info
 */
export async function getPlaybackInfo(browser: BrowserType): Promise<MediaInfo | null> {
  const jsCode = `
    (function() {
      const video = document.querySelector('video');
      if (!video) return JSON.stringify({error: 'no-video'});
      
      const title = document.querySelector('h1.ytd-watch-metadata yt-formatted-string')?.textContent || 'Unknown';
      
      return JSON.stringify({
        title: title,
        url: window.location.href,
        isPlaying: !video.paused,
        currentTime: Math.floor(video.currentTime),
        duration: Math.floor(video.duration)
      });
    })();
  `;

  try {
    const result = await executeInYouTubeTab(browser, jsCode);
    const info = JSON.parse(result);

    if (info.error) {
      return null;
    }

    return {
      ...info,
      browser,
    };
  } catch (error) {
    console.error("Error getting playback info:", error);
    return null;
  }
}

/**
 * Skip forward by seconds
 */
export async function skipForward(browser: BrowserType, seconds: number = 10): Promise<void> {
  const jsCode = `
    (function() {
      const video = document.querySelector('video');
      if (video) {
        video.currentTime += ${seconds};
        return 'skipped';
      }
      return 'no-video';
    })();
  `;

  await executeInYouTubeTab(browser, jsCode);
}

/**
 * Skip backward by seconds
 */
export async function skipBackward(browser: BrowserType, seconds: number = 10): Promise<void> {
  const jsCode = `
    (function() {
      const video = document.querySelector('video');
      if (video) {
        video.currentTime = Math.max(0, video.currentTime - ${seconds});
        return 'skipped';
      }
      return 'no-video';
    })();
  `;

  await executeInYouTubeTab(browser, jsCode);
}

/**
 * Adjust volume using YouTube keyboard shortcuts
 */
export async function adjustVolume(browser: BrowserType, delta: number, targetUrl?: string): Promise<void> {
  // YouTube keyboard shortcuts: Up arrow = +5%, Down arrow = -5%
  // We'll simulate 2 presses for ~10%
  const key = delta > 0 ? "ArrowUp" : "ArrowDown";
  const keyCode = delta > 0 ? 38 : 40;

  const jsCode = `
    (function() {
      const video = document.querySelector('video');
      if (!video) return 'no-video';
      
      // Focus the video player to receive keyboard events
      video.focus();
      
      // Dispatch arrow key events (YouTube listens to these)
      for (let i = 0; i < 2; i++) {
        const event = new KeyboardEvent('keydown', {
          key: '${key}',
          keyCode: ${keyCode},
          code: '${key}',
          bubbles: true,
          cancelable: true,
          view: window
        });
        
        document.dispatchEvent(event);
        video.dispatchEvent(event);
      }
      
      return 'volume-adjusted';
    })();
  `;

  await executeInYouTubeTab(browser, jsCode, targetUrl);
}

/**
 * Toggle mute/unmute by clicking YouTube's mute button
 */
export async function toggleMute(browser: BrowserType, targetUrl?: string): Promise<string> {
  const jsCode = `
    (function() {
      const video = document.querySelector('video');
      if (!video) return 'no-video';
      
      // Find and click YouTube's mute button
      const muteButton = document.querySelector('.ytp-mute-button');
      if (muteButton) {
        muteButton.click();
        
        // Check resulting state
        return video.muted ? 'muted' : 'unmuted';
      }
      
      // Fallback: toggle directly
      video.muted = !video.muted;
      return video.muted ? 'muted' : 'unmuted';
    })();
  `;

  const result = await executeInYouTubeTab(browser, jsCode, targetUrl);
  return result;
}

/**
 * Focus on a specific browser tab by URL
 */
export async function focusTab(browser: BrowserType, targetUrl: string): Promise<void> {
  if (CHROMIUM_BROWSERS.includes(browser)) {
    await focusChromiumTab(browser, targetUrl);
  } else if (browser === "Safari") {
    await focusSafariTab(targetUrl);
  } else {
    throw new Error(`Focusing tabs is not supported for ${browser}. Dia doesn't support AppleScript automation yet.`);
  }
}

/**
 * Focus on a specific tab in Chromium browsers
 */
async function focusChromiumTab(browser: BrowserType, targetUrl: string): Promise<void> {
  const script = `
    tell application "${browser}"
      set tabFound to false
      set windowIndex to 1
      set targetWindowIndex to 1
      
      repeat with w in windows
        set tabIndex to 0
        repeat with t in tabs of w
          set tabIndex to tabIndex + 1
          if URL of t is "${targetUrl}" then
            set targetWindowIndex to windowIndex
            
            -- Make it the active window
            set index of window windowIndex to 1
            
            -- Switch to the tab
            set active tab index of window windowIndex to tabIndex
            set tabFound to true
            exit repeat
          end if
        end repeat
        if tabFound then exit repeat
        set windowIndex to windowIndex + 1
      end repeat
      
      -- Activate the browser
      activate
    end tell
    
    -- Un-minimize using System Events (works for all Chromium browsers)
    tell application "System Events"
      tell process "${browser}"
        set windowList to every window
        if (count of windowList) ≥ targetWindowIndex then
          set targetWindow to item targetWindowIndex of windowList
          if value of attribute "AXMinimized" of targetWindow is true then
            set value of attribute "AXMinimized" of targetWindow to false
          end if
          -- Bring window to front
          perform action "AXRaise" of targetWindow
        end if
      end tell
    end tell
  `;

  try {
    await runAppleScript(script);
  } catch (error) {
    console.error(`Error focusing tab in ${browser}:`, error);
    throw error;
  }
}

/**
 * Focus on a specific tab in Safari
 */
async function focusSafariTab(targetUrl: string): Promise<void> {
  const script = `
    tell application "Safari"
      activate
      
      -- Small delay to ensure Safari is fully activated
      delay 0.1
      
      set tabFound to false
      repeat with w in windows
        repeat with t in tabs of w
          if URL of t is "${targetUrl}" then
            -- Un-minimize the window if it's minimized
            set miniaturized of w to false
            
            -- Small delay to ensure window is un-minimized
            delay 0.1
            
            -- Make it the active window
            set index of w to 1
            
            -- Small delay to ensure window is brought to front
            delay 0.1
            
            -- Switch to the tab
            set current tab of w to t
            set tabFound to true
            exit repeat
          end if
        end repeat
        if tabFound then exit repeat
      end repeat
    end tell
  `;

  try {
    await runAppleScript(script);
  } catch (error) {
    console.error("Error focusing tab in Safari:", error);
    throw error;
  }
}
