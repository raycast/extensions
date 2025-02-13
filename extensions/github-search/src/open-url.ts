import { runAppleScript } from '@raycast/utils';

const SUPPORTED_BROWSERS = ['Google Chrome', 'Safari'];

type SupportedBrowser = (typeof SUPPORTED_BROWSERS)[number];

export const isSupportBrowser = (name: string): name is SupportedBrowser => SUPPORTED_BROWSERS.includes(name);

export function focusOrOpenUrl(url: string, matchUrl: string, browser: SupportedBrowser) {
  const scripts = {
    'Google Chrome': `
      tell application "Google Chrome"
        set targetUrl to "${url}"
        set matchUrl to "${matchUrl}"
        repeat with win in windows
          set tabIndex to 0
          repeat with t in tabs of win
            set tabIndex to tabIndex + 1
            set tabUrl to URL of t
            if tabUrl starts with matchUrl then
              set active tab index of win to tabIndex
              set URL of tab tabIndex of win to targetUrl
              activate
              return "Tab " & tabIndex & ": " & tabUrl
            end if
          end repeat
        end repeat
        tell window 1 to make new tab with properties {URL:targetUrl}
        return "New tab: " & targetUrl
      end tell`,
    Safari: `
      tell application "Safari"
        set targetUrl to "${url}"
        set matchUrl to "${matchUrl}"
        repeat with win in windows
          repeat with t in tabs of win
            if URL of t starts with matchUrl then
              set current tab of win to t
              set URL of current tab of win to targetUrl
              activate
              return "Tab: " & URL of t
            end if
          end repeat
        end repeat
        tell window 1 to make new tab with properties {URL:targetUrl}
        return "New tab: " & targetUrl
      end tell`
  };

  if (browser in scripts) runAppleScript(scripts[browser as keyof typeof scripts]);
}
