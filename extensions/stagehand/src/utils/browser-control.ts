import { runAppleScript } from "@raycast/utils";

export type BrowserType = "Google Chrome" | "Arc" | "Brave Browser" | "Safari";

export interface MediaInfo {
  title: string;
  url: string;
  isPlaying: boolean;
  currentTime?: number;
  duration?: number;
  browser: BrowserType;
  tabIndex?: number;
}

const CHROMIUM_BROWSERS: BrowserType[] = ["Google Chrome", "Arc", "Brave Browser"];

// Shared AppleScript helper for escaping text
const APPLESCRIPT_TEXT_HELPER = `
on replaceText(theText, searchString, replacementString)
  set AppleScript's text item delimiters to searchString
  set theTextItems to every text item of theText
  set AppleScript's text item delimiters to replacementString
  set theText to theTextItems as string
  set AppleScript's text item delimiters to ""
  return theText
end replaceText
`;

/**
 * Find all YouTube tabs across supported browsers
 */
export async function findYouTubeTabs(): Promise<MediaInfo[]> {
  const tabs: MediaInfo[] = [];

  for (const browser of CHROMIUM_BROWSERS) {
    try {
      const browserTabs = await findYouTubeTabsInChromiumBrowser(browser);
      tabs.push(...browserTabs);
    } catch {
      // Browser not installed or not running, skip it
    }
  }

  // Check Safari separately
  try {
    const safariTabs = await findYouTubeTabsInSafari();
    tabs.push(...safariTabs);
  } catch {
    // Safari not available, skip it
  }

  return tabs;
}

/**
 * Find YouTube tabs in Chromium-based browsers (Chrome, Arc, Brave)
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
    
    ${APPLESCRIPT_TEXT_HELPER}
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
      
      set output to "["
      set firstItem to true
      
      repeat with w in windows
        repeat with t in tabs of w
          set tabURL to URL of t
          if tabURL contains "youtube.com/watch" then
            set tabTitle to name of t
            
            -- Escape quotes in title and URL for JSON
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
    
    ${APPLESCRIPT_TEXT_HELPER}
  `;

  try {
    const result = await runAppleScript(script);

    if (result === "[]" || result === "" || result.trim() === "") {
      return [];
    }

    // Parse the JSON result
    const parsed = JSON.parse(result);

    return parsed.map((item: { title: string; url: string }) => ({
      title: item.title,
      url: item.url,
      isPlaying: false,
      browser: "Safari" as BrowserType,
    }));
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
 *
 * IMPORTANT: Safari requires the window to be frontmost for JavaScript execution.
 * This is a Safari security limitation that cannot be bypassed.
 *
 * To minimize disruption, we:
 * 1. Remember the previously active application
 * 2. Activate Safari only long enough to execute JavaScript
 * 3. Restore focus to the previous application immediately
 *
 * Note: For true background control without activation, users should use
 * Chrome, Arc, Brave, or Dia instead of Safari.
 */
async function executeInSafari(jsCode: string, targetUrl?: string): Promise<string> {
  // Escape the JavaScript code for AppleScript
  // Escape backslashes first, then quotes, then newlines
  const escapedJS = jsCode
    .replace(/\\/g, "\\\\")
    .replace(/"/g, '\\"')
    .replace(/\n/g, "\\n")
    .replace(/\r/g, "\\r")
    .replace(/\t/g, "\\t");

  // Extract base URL (without query params) for more flexible matching
  const baseTargetUrl = targetUrl ? targetUrl.split("?")[0].split("&")[0] : "";
  const escapedTargetUrl = targetUrl ? targetUrl.replace(/"/g, '\\"') : "";
  const escapedBaseUrl = baseTargetUrl ? baseTargetUrl.replace(/"/g, '\\"') : "";

  // Try to restore focus to the previous app after execution
  const script = targetUrl
    ? `
      -- Remember what application was frontmost before we activate Safari
      tell application "System Events"
        set previousAppProcess to first application process whose frontmost is true
        set previousAppName to name of previousAppProcess
      end tell
      
      set jsResult to ""
      tell application "Safari"
        if not running then return ""
        
        -- Find the tab first
        set targetWindow to missing value
        set targetTab to missing value
        
        repeat with w in windows
          repeat with t in tabs of w
            set currentURL to URL of t
            if currentURL contains "${escapedBaseUrl}" or currentURL is "${escapedTargetUrl}" then
              set targetWindow to w
              set targetTab to t
              exit repeat
            end if
          end repeat
          if targetWindow is not missing value then exit repeat
        end repeat
        
        if targetWindow is missing value then return ""
        
        -- Ensure window is visible (but don't activate yet)
        set miniaturized of targetWindow to false
        
        -- Activate Safari (required for JavaScript execution - Safari limitation)
        activate
        
        -- Bring window to front
        set index of targetWindow to 1
        
        delay 0.1
        
        -- Make this tab active (required for JavaScript execution)
        set current tab of targetWindow to targetTab
        
        -- Wait longer for tab to be fully active and ready for JavaScript
        delay 0.3
        
        -- Verify the tab is ready by checking if it has a URL
        try
          set currentURL to URL of current tab of targetWindow
          if currentURL is "" then
            return "error:Tab not ready"
          end if
        on error
          return "error:Cannot access tab"
        end try
        
        -- Wait longer for page to be ready before executing JavaScript
        delay 0.5
        
        -- Execute JavaScript directly - must be done on active tab of frontmost window
        -- Skip the readiness check as it may cause hanging
        try
          set jsResult to do JavaScript "${escapedJS}" in current tab of targetWindow
          -- Ensure jsResult is set (AppleScript might return undefined)
          if jsResult is missing value or jsResult is "" then
            set jsResult to "no-result"
          end if
        on error errMsg
          return "error:" & errMsg
        end try
        
        -- Wait a bit after JavaScript execution to ensure video state changes complete
        delay 0.15
      end tell
      
      -- Ensure we always return something
      if jsResult is "" or jsResult is missing value then
        set jsResult to "no-result"
      end if
      
      -- Restore focus to previous app if it's not Safari or Raycast
      -- Note: We don't restore focus if previous app is Raycast, as that would close the Now Playing menu
      -- and interrupt the video state change. Let Safari stay active slightly longer in this case.
      if previousAppName is not "Safari" and previousAppName is not "Raycast" and previousAppName is not "" then
        try
          -- Additional delay to ensure all state changes are complete before restoring focus
          delay 0.1
          -- Try using System Events first (more reliable)
          tell application "System Events"
            try
              set appToRestore to first application process whose name is previousAppName
              if exists appToRestore then
                set frontmost of appToRestore to true
              else
                -- Fallback: try using tell application directly
                tell application previousAppName to activate
              end if
            on error
              -- Fallback: try using tell application directly
              try
                tell application previousAppName to activate
              end try
            end try
          end tell
        on error
          -- If app doesn't exist or can't be activated, ignore the error
        end try
      else if previousAppName is "Raycast" then
        -- If previous app was Raycast (Now Playing menu open), wait longer before doing anything
        -- This ensures video state changes complete, but we don't restore focus (user is in Raycast anyway)
        delay 0.2
      end if
      
      return jsResult as string
    `
    : `
      -- Remember what application was frontmost before we activate Safari
      tell application "System Events"
        set previousAppProcess to first application process whose frontmost is true
        set previousAppName to name of previousAppProcess
      end tell
      
      set jsResult to ""
      tell application "Safari"
        if not running then return ""
        
        -- Find the first YouTube tab
        set targetWindow to missing value
        set targetTab to missing value
        
        repeat with w in windows
          repeat with t in tabs of w
            set currentURL to URL of t
            if currentURL contains "youtube.com/watch" then
              set targetWindow to w
              set targetTab to t
              exit repeat
            end if
          end repeat
          if targetWindow is not missing value then exit repeat
        end repeat
        
        if targetWindow is missing value then return ""
        
        -- Ensure window is visible
        set miniaturized of targetWindow to false
        
        -- Activate Safari (required for JavaScript execution)
        activate
        
        -- Bring window to front
        set index of targetWindow to 1
        
        delay 0.1
        
        -- Make this tab active
        set current tab of targetWindow to targetTab
        
        -- Wait longer for tab to be fully active and ready for JavaScript
        delay 0.3
        
        -- Verify the tab is ready by checking if it has a URL
        try
          set currentURL to URL of current tab of targetWindow
          if currentURL is "" then
            return "error:Tab not ready"
          end if
        on error
          return "error:Cannot access tab"
        end try
        
        -- Wait longer for page to be ready before executing JavaScript
        delay 0.5
        
        -- Execute JavaScript directly
        -- Skip the readiness check as it may cause hanging
        try
          set jsResult to do JavaScript "${escapedJS}" in current tab of targetWindow
          -- Ensure jsResult is set (AppleScript might return undefined)
          if jsResult is missing value or jsResult is "" then
            set jsResult to "no-result"
          end if
        on error errMsg
          return "error:" & errMsg
        end try
        
        -- Wait a bit after JavaScript execution to ensure video state changes complete
        delay 0.15
      end tell
      
      -- Restore focus to previous app if it's not Safari or Raycast
      -- Note: We don't restore focus if previous app is Raycast, as that would close the Now Playing menu
      -- and interrupt the video state change. Let Safari stay active slightly longer in this case.
      if previousAppName is not "Safari" and previousAppName is not "Raycast" and previousAppName is not "" then
        try
          -- Additional delay to ensure all state changes are complete before restoring focus
          delay 0.1
          -- Try using System Events first (more reliable)
          tell application "System Events"
            try
              set appToRestore to first application process whose name is previousAppName
              if exists appToRestore then
                set frontmost of appToRestore to true
              else
                -- Fallback: try using tell application directly
                tell application previousAppName to activate
              end if
            on error
              -- Fallback: try using tell application directly
              try
                tell application previousAppName to activate
              end try
            end try
          end tell
        on error
          -- If app doesn't exist or can't be activated, ignore the error
        end try
      else if previousAppName is "Raycast" then
        -- If previous app was Raycast (Now Playing menu open), wait longer before doing anything
        -- This ensures video state changes complete, but we don't restore focus (user is in Raycast anyway)
        delay 0.2
      end if
      
      return jsResult as string
    `;

  try {
    // Set a timeout wrapper to catch hanging scripts
    const timeoutPromise = new Promise<string>((_, reject) => {
      setTimeout(() => reject(new Error("Safari JavaScript execution timed out after 10 seconds")), 10000);
    });

    const scriptPromise = runAppleScript(script).then((result) => {
      // Handle error results from Safari
      if (result && typeof result === "string" && result.startsWith("error:")) {
        const errorMsg = result.substring(6);
        throw new Error(`Safari JavaScript error: ${errorMsg}`);
      }

      return result || "";
    });

    const result = await Promise.race([scriptPromise, timeoutPromise]);
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
  // For Safari, use the hybrid approach that activates Safari and runs JavaScript
  // within the AppleScript context (more reliable than trying to execute JS while
  // Safari is being activated). This approach also has a click+space fallback.
  if (browser === "Safari") {
    return togglePlayPauseSafariHybrid(targetUrl);
  }

  // For other browsers, use JavaScript execution
  const jsCode = `(function(){try{var v=document.querySelector('video');if(!v)return'no-video';if(v.paused){v.play().catch(function(){});if(v.paused){return'failed-to-play';}return'playing';}else{v.pause();return'paused';}}catch(e){return'error:'+e.message;}})();`;

  try {
    const result = await executeInYouTubeTab(browser, jsCode, targetUrl);

    if (!result) {
      return "toggled";
    }

    const trimmedResult = result.trim();

    // Handle error responses
    if (trimmedResult.startsWith("error:")) {
      throw new Error(trimmedResult);
    }

    return trimmedResult || "toggled";
  } catch (error) {
    console.error(`Error in togglePlayPause for ${browser}:`, error);
    throw error;
  }
}

/**
 * Debug version of togglePlayPause that returns a step-by-step trace of what was attempted.
 * Useful when Safari is brought frontmost but JS execution doesn't run — this will
 * return the raw results for each JS attempt and the keyboard fallback.
 */
export async function debugTogglePlayPause(browser: BrowserType, targetUrl?: string): Promise<string> {
  const lines: string[] = [];

  lines.push(`debug start for browser=${browser}${targetUrl ? ` url=${targetUrl}` : ""}`);

  if (browser !== "Safari") {
    lines.push("Non-Safari browser: delegating to normal togglePlayPause");
    try {
      const result = await togglePlayPause(browser, targetUrl);
      lines.push(`result=${result}`);
    } catch (e) {
      lines.push(`error=${String(e)}`);
    }
    return lines.join("\n");
  }

  lines.push("Safari path: using hybrid approach (activate Safari + JS-in-AppleScript)");

  try {
    const result = await togglePlayPauseSafariHybrid(targetUrl);
    lines.push(`hybridResult=${String(result)}`);
    lines.push("hybrid approach completed successfully");
    return lines.join("\n");
  } catch (err) {
    lines.push(`hybridError=${String(err)}`);
    return lines.join("\n");
  }
}

/**
 * Toggle play/pause in Safari using a hybrid approach:
 * 1. Activate Safari and focus the target tab
 * 2. Wait for tab to be fully ready (0.6s delay)
 * 3. Try JavaScript execution within AppleScript context (most reliable)
 * 4. If JavaScript fails, fall back to click + space bar
 *
 * This approach is more reliable than calling executeInSafari from TypeScript
 * because the JavaScript runs after Safari is fully activated and the delays
 * are all within a single AppleScript execution.
 */
async function togglePlayPauseSafariHybrid(targetUrl?: string): Promise<string> {
  const { runAppleScript } = await import("@raycast/utils");

  const baseTargetUrl = targetUrl ? targetUrl.split("?")[0].split("&")[0] : "";
  const escapedTargetUrl = targetUrl ? targetUrl.replace(/"/g, '\\"') : "";
  const escapedBaseUrl = baseTargetUrl ? baseTargetUrl.replace(/"/g, '\\"') : "";

  // Remember previous app
  const script = targetUrl
    ? `
      -- Remember what application was frontmost before we activate Safari
      tell application "System Events"
        set previousAppProcess to first application process whose frontmost is true
        set previousAppName to name of previousAppProcess
      end tell
      
      tell application "Safari"
        if not running then return "error:Safari not running"
        
        -- Find the tab first
        set targetWindow to missing value
        set targetTab to missing value
        
        repeat with w in windows
          repeat with t in tabs of w
            set currentURL to URL of t
            if currentURL contains "${escapedBaseUrl}" or currentURL is "${escapedTargetUrl}" then
              set targetWindow to w
              set targetTab to t
              exit repeat
            end if
          end repeat
          if targetWindow is not missing value then exit repeat
        end repeat
        
        if targetWindow is missing value then return "error:Tab not found"
        
        -- Ensure window is visible
        set miniaturized of targetWindow to false
        
        -- Activate Safari
        activate
        
        -- Bring window to front
        set index of targetWindow to 1
        
        -- Make this tab active
        set current tab of targetWindow to targetTab
        
        -- Wait for Safari to activate and tab to become ready
        delay 0.8
        
        -- Verify Safari is actually frontmost before proceeding
        tell application "System Events"
          set frontmostApp to name of first application process whose frontmost is true
          if frontmostApp is not "Safari" then
            -- Force Safari to front if it's not there yet
            tell application process "Safari" to set frontmost to true
            delay 0.5
          end if
        end tell
        
        -- Poll to verify the tab is actually ready for JavaScript execution
        -- Try up to 5 times with 0.3s between attempts
        set tabReady to false
        repeat 5 times
          try
            set testResult to do JavaScript "document.querySelector('video') ? 'ready' : 'no-video'" in targetTab
            if testResult is "ready" then
              set tabReady to true
              exit repeat
            end if
          end try
          delay 0.3
        end repeat
        
        if not tabReady then
          return "error:Tab not ready for JavaScript"
        end if
        
        -- Add additional delay after polling - Safari needs extra time to fully settle
        -- when activated from Raycast (different from Terminal activation)
        delay 1.0
        
        -- Now try JavaScript after all the delays and verification
        set jsResult to "no-result"
        try
          set jsResult to do JavaScript "(function(){var v=document.querySelector('video');if(!v)return'no-video';if(v.paused){v.play();return'playing';}else{v.pause();return'paused';}})();" in targetTab
          if jsResult is missing value then
            set jsResult to "missing-value"
          end if
          delay 0.5
        on error jsErr
          set jsResult to "js-error:" & jsErr
        end try
      end tell
      
      return jsResult
    `
    : `
      -- Remember what application was frontmost before we activate Safari
      tell application "System Events"
        set previousAppProcess to first application process whose frontmost is true
        set previousAppName to name of previousAppProcess
      end tell
      
      tell application "Safari"
        if not running then return "error:Safari not running"
        
        -- Find the first YouTube tab
        set targetWindow to missing value
        set targetTab to missing value
        
        repeat with w in windows
          repeat with t in tabs of w
            set currentURL to URL of t
            if currentURL contains "youtube.com/watch" then
              set targetWindow to w
              set targetTab to t
              exit repeat
            end if
          end repeat
          if targetWindow is not missing value then exit repeat
        end repeat
        
        if targetWindow is missing value then return "error:No YouTube tab found"
        
        -- Ensure window is visible
        set miniaturized of targetWindow to false
        
        -- Activate Safari
        activate
        
        -- Bring window to front
        set index of targetWindow to 1
        
        -- Make this tab active
        set current tab of targetWindow to targetTab
        
        -- Wait for Safari to activate and tab to become ready
        delay 0.8
        
        -- Verify Safari is actually frontmost before proceeding
        tell application "System Events"
          set frontmostApp to name of first application process whose frontmost is true
          if frontmostApp is not "Safari" then
            -- Force Safari to front if it's not there yet
            tell application process "Safari" to set frontmost to true
            delay 0.5
          end if
        end tell
        
        -- Poll to verify the tab is actually ready for JavaScript execution
        -- Try up to 5 times with 0.3s between attempts
        set tabReady to false
        repeat 5 times
          try
            set testResult to do JavaScript "document.querySelector('video') ? 'ready' : 'no-video'" in targetTab
            if testResult is "ready" then
              set tabReady to true
              exit repeat
            end if
          end try
          delay 0.3
        end repeat
        
        if not tabReady then
          return "error:Tab not ready for JavaScript"
        end if
        
        -- Brief additional delay after polling confirms tab is ready
        delay 0.3
        
        -- Now try JavaScript after all the delays and verification
        set jsResult to "no-result"
        try
          set jsResult to do JavaScript "(function(){var v=document.querySelector('video');if(!v)return'no-video';if(v.paused){v.play();return'playing';}else{v.pause();return'paused';}})();" in targetTab
          if jsResult is missing value then
            set jsResult to "missing-value"
          end if
          delay 0.5
        on error jsErr
          set jsResult to "js-error:" & jsErr
        end try
      end tell
      
      return jsResult
    `;

  try {
    const result = await Promise.race([
      runAppleScript(script),
      new Promise<string>((_, reject) =>
        setTimeout(() => reject(new Error("Safari hybrid action timed out after 15 seconds")), 15000),
      ),
    ]);

    // Check if result indicates an error
    if (result && typeof result === "string" && result.startsWith("error:")) {
      const errorMsg = result.substring(6);
      throw new Error(errorMsg);
    }

    const trimmed = result.trim();
    return trimmed || "toggled";
  } catch (error) {
    console.error("Error in togglePlayPauseSafariHybrid:", error);
    throw error;
  }
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
export async function skipForward(browser: BrowserType, seconds: number = 10, targetUrl?: string): Promise<void> {
  // Simplified one-line JavaScript for Safari compatibility
  const secondsStr = seconds.toString();
  const jsCode = `(function(){var v=document.querySelector('video');if(v){v.currentTime+=${secondsStr};return'skipped';}return'no-video';})();`;

  try {
    await executeInYouTubeTab(browser, jsCode, targetUrl);
  } catch (error) {
    console.error(`Error in skipForward for ${browser}:`, error);
    throw error;
  }
}

/**
 * Skip backward by seconds
 */
export async function skipBackward(browser: BrowserType, seconds: number = 10, targetUrl?: string): Promise<void> {
  // Simplified one-line JavaScript for Safari compatibility
  const secondsStr = seconds.toString();
  const jsCode = `(function(){var v=document.querySelector('video');if(v){v.currentTime=Math.max(0,v.currentTime-${secondsStr});return'skipped';}return'no-video';})();`;

  try {
    await executeInYouTubeTab(browser, jsCode, targetUrl);
  } catch (error) {
    console.error(`Error in skipBackward for ${browser}:`, error);
    throw error;
  }
}

/**
 * Adjust volume by directly setting video.volume and triggering YouTube's volume change
 * Uses YouTube player API if available, otherwise manipulates video element and slider
 */
export async function adjustVolume(browser: BrowserType, delta: number, targetUrl?: string): Promise<void> {
  const deltaStr = delta.toString();

  // Comprehensive approach: set volume on video, update YouTube player API, and manipulate slider
  const jsCode = `(function(){try{var v=document.querySelector('video');if(!v)return'no-video';var oldVol=v.volume||1.0;var newVol=Math.max(0,Math.min(1,oldVol+${deltaStr}));v.volume=newVol;if(v.muted&&newVol>0)v.muted=false;var playerEl=document.querySelector('#movie_player');if(playerEl){var player=playerEl;if(player.getVolume){var currentVol=player.getVolume()/100;var ytNewVol=Math.max(0,Math.min(100,(currentVol+${deltaStr})*100));try{player.setVolume(ytNewVol);}catch(e){}}else if(playerEl.setVolume){try{playerEl.setVolume(newVol*100);}catch(e){}}else if(window.ytplayer&&window.ytplayer.config){try{var config=window.ytplayer.config;if(config.args&&config.args.volume!==undefined){config.args.volume=newVol*100;}if(window.ytplayer.setVolume){window.ytplayer.setVolume(newVol*100);}}catch(e){}}}var volSlider=document.querySelector('.ytp-volume-slider');if(volSlider){var handle=volSlider.querySelector('.ytp-volume-slider-handle');var track=volSlider.querySelector('.ytp-volume-slider-track');if(handle&&track){var rect=track.getBoundingClientRect();var newPos=newVol*rect.width;handle.style.left=newPos+'px';handle.setAttribute('aria-valuenow',(newVol*100).toString());var inputEvent=new Event('input',{bubbles:true,cancelable:true});var changeEvent=new Event('change',{bubbles:true,cancelable:true});volSlider.dispatchEvent(inputEvent);volSlider.dispatchEvent(changeEvent);}}return'volume-adjusted:old='+oldVol.toFixed(2)+',new='+newVol.toFixed(2);}catch(e){return'error:'+e.message;}})();`;

  try {
    const result = await executeInYouTubeTab(browser, jsCode, targetUrl);

    if (result && result.trim().startsWith("error:")) {
      throw new Error(result.trim());
    }
  } catch (error) {
    console.error(`Error in adjustVolume for ${browser}:`, error);
    throw error;
  }
}

/**
 * Toggle mute/unmute by clicking YouTube's mute button
 */
export async function toggleMute(browser: BrowserType, targetUrl?: string): Promise<string> {
  // Simplified one-line JavaScript for Safari compatibility
  const jsCode = `(function(){var v=document.querySelector('video');if(!v)return'no-video';var btn=document.querySelector('.ytp-mute-button');if(btn){btn.click();return v.muted?'muted':'unmuted';}v.muted=!v.muted;return v.muted?'muted':'unmuted';})();`;

  try {
    const result = await executeInYouTubeTab(browser, jsCode, targetUrl);
    return result.trim();
  } catch (error) {
    console.error(`Error in toggleMute for ${browser}:`, error);
    throw error;
  }
}

/**
 * Focus on a specific browser tab by URL
 */
export async function focusTab(browser: BrowserType, targetUrl: string): Promise<void> {
  if (CHROMIUM_BROWSERS.includes(browser)) {
    await focusChromiumTab(browser, targetUrl);
  } else if (browser === "Safari") {
    await focusSafariTab(targetUrl);
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
