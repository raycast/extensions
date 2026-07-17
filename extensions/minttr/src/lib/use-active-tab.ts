import { getFrontmostApplication } from "@raycast/api";
import { runAppleScript } from "@raycast/utils";
import { useEffect, useState } from "react";

// AppleScript to get URL from different browsers
const getUrlScript = (bundleId: string): string => {
  switch (bundleId) {
    case "com.apple.Safari":
      return `tell application "Safari" to return URL of front document`;
    case "com.google.Chrome":
      return `tell application "Google Chrome" to return URL of active tab of front window`;
    case "com.microsoft.edgemac":
      return `tell application "Microsoft Edge" to return URL of active tab of front window`;
    case "com.brave.Browser":
      return `tell application "Brave Browser" to return URL of active tab of front window`;
    case "company.thebrowser.Browser":
      return `tell application "Arc" to return URL of active tab of front window`;
    case "company.thebrowser.dia":
      // Dia uses different AppleScript syntax - need to iterate tabs to find focused one
      return `tell application "Dia"
        set targetURL to ""
        repeat with w in every window
          repeat with t in every tab of w
            if isFocused of t then
              set targetURL to URL of t
              exit repeat
            end if
          end repeat
          if targetURL is not "" then exit repeat
        end repeat
        return targetURL
      end tell`;
    case "org.mozilla.firefox":
      // Firefox doesn't support AppleScript well
      return "";
    default:
      return "";
  }
};

interface UseActiveTabResult {
  url: string | null;
  isLoading: boolean;
}

export function useActiveTab(): UseActiveTabResult {
  const [url, setUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchActiveTab() {
      try {
        const app = await getFrontmostApplication();
        const bundleId = app.bundleId || "";

        const urlScript = getUrlScript(bundleId);
        if (!urlScript) {
          setIsLoading(false);
          return;
        }

        const tabUrl = await runAppleScript(urlScript);
        if (tabUrl) {
          setUrl(tabUrl);
        }
      } catch (error) {
        console.error("Failed to get active tab:", error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchActiveTab();
  }, []);

  return { url, isLoading };
}
