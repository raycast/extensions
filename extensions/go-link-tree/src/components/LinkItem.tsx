import {
  List,
  ActionPanel,
  Action,
  Icon,
  open,
  showToast,
  Toast,
} from "@raycast/api";
import { exec } from "child_process";
import { promisify } from "util";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import type { Link } from "../types";
import { resolveIcon } from "../lib/icons";
import { getIconForUrl } from "../lib/domain-icons";

const execAsync = promisify(exec);

interface LinkItemProps {
  link: Link;
  groupTitle?: string;
  defaultBrowser?: string;
  defaultProfile?: string;
}

// Map of known browser bundle identifiers to their app names for open command
const BROWSER_APP_NAMES: Record<string, string> = {
  "com.google.Chrome": "Google Chrome",
  "com.brave.Browser": "Brave Browser",
  "org.mozilla.firefox": "Firefox",
  "com.apple.Safari": "Safari",
  "company.thebrowser.Browser": "Arc",
  "com.microsoft.edgemac": "Microsoft Edge",
};

// Short display names for accessories
const BROWSER_SHORT_NAMES: Record<string, string> = {
  "com.google.Chrome": "Chrome",
  "Google Chrome": "Chrome",
  "com.brave.Browser": "Brave",
  "Brave Browser": "Brave",
  "org.mozilla.firefox": "Firefox",
  Firefox: "Firefox",
  "com.apple.Safari": "Safari",
  Safari: "Safari",
  "company.thebrowser.Browser": "Arc",
  Arc: "Arc",
  "com.microsoft.edgemac": "Edge",
  "Microsoft Edge": "Edge",
};

// Chromium-based browsers use --profile-directory flag
const CHROMIUM_BROWSERS = [
  "com.google.Chrome",
  "com.brave.Browser",
  "com.microsoft.edgemac",
  "Google Chrome",
  "Brave Browser",
  "Microsoft Edge",
];

// Path to Local State file for each Chromium browser (contains profile name mappings)
const BROWSER_LOCAL_STATE_PATHS: Record<string, string> = {
  "com.google.Chrome": "Google/Chrome/Local State",
  "Google Chrome": "Google/Chrome/Local State",
  "com.brave.Browser": "BraveSoftware/Brave-Browser/Local State",
  "Brave Browser": "BraveSoftware/Brave-Browser/Local State",
  "com.microsoft.edgemac": "Microsoft Edge/Local State",
  "Microsoft Edge": "Microsoft Edge/Local State",
};

// Direct path to browser binaries (needed to pass args to already-running browsers)
const BROWSER_BINARY_PATHS: Record<string, string> = {
  "com.google.Chrome":
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "Google Chrome":
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "com.brave.Browser":
    "/Applications/Brave Browser.app/Contents/MacOS/Brave Browser",
  "Brave Browser":
    "/Applications/Brave Browser.app/Contents/MacOS/Brave Browser",
  "com.microsoft.edgemac":
    "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
  "Microsoft Edge":
    "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
  "org.mozilla.firefox": "/Applications/Firefox.app/Contents/MacOS/firefox",
  Firefox: "/Applications/Firefox.app/Contents/MacOS/firefox",
};

/**
 * Resolves a profile display name (e.g., "Work") to its directory name (e.g., "Profile 1")
 * by reading the browser's Local State file.
 * If not found, returns the original name (assumes it's already a directory name).
 */
function resolveProfileDirectory(app: string, profileName: string): string {
  const localStatePath = BROWSER_LOCAL_STATE_PATHS[app];
  if (!localStatePath) {
    return profileName; // Not a known Chromium browser, return as-is
  }

  const fullPath = path.join(
    os.homedir(),
    "Library",
    "Application Support",
    localStatePath
  );

  try {
    if (!fs.existsSync(fullPath)) {
      return profileName;
    }

    const localState = JSON.parse(fs.readFileSync(fullPath, "utf-8"));
    const profileInfoCache = localState?.profile?.info_cache;

    if (!profileInfoCache) {
      return profileName;
    }

    // Search for a profile with matching display name
    for (const [dirName, info] of Object.entries(profileInfoCache)) {
      const profileInfo = info as {
        name?: string;
        gaia_name?: string;
        user_name?: string;
      };
      // Check against display name, GAIA name (Google account name), and user_name
      if (
        profileInfo.name === profileName ||
        profileInfo.gaia_name === profileName ||
        profileInfo.user_name === profileName ||
        dirName === profileName // Also allow direct directory name
      ) {
        return dirName;
      }
    }

    // Profile not found by display name, return original (might be directory name already)
    return profileName;
  } catch (error) {
    // If reading fails, return original name
    return profileName;
  }
}

export function LinkItem({
  link,
  defaultBrowser,
  defaultProfile,
}: LinkItemProps) {
  // Icon resolution priority:
  // 1. Explicit icon in config
  // 2. Domain-based auto-detection
  // 3. Default Link icon
  let icon = resolveIcon(link.icon);
  if (!link.icon) {
    const domainIcon = getIconForUrl(link.url);
    if (domainIcon) {
      icon = domainIcon;
    } else {
      icon = Icon.Link;
    }
  }

  // Application resolution priority:
  // 1. Link-level application
  // 2. Global defaultBrowser setting
  // 3. System default (undefined)
  const targetApplication =
    link.application ||
    (defaultBrowser !== "default" ? defaultBrowser : undefined);

  // Profile resolution priority:
  // 1. Link-level profile
  // 2. Global defaultProfile setting
  // 3. No profile (undefined)
  const targetProfile = link.profile || defaultProfile;

  const openWithProfile = async (
    app: string,
    profile: string,
    url: string
  ): Promise<void> => {
    // Get the app name and binary path
    const appName = BROWSER_APP_NAMES[app] || app;
    const binaryPath =
      BROWSER_BINARY_PATHS[app] || BROWSER_BINARY_PATHS[appName];
    const isChromium = CHROMIUM_BROWSERS.some(
      (b) =>
        b.toLowerCase() === app.toLowerCase() ||
        b.toLowerCase() === appName.toLowerCase()
    );

    let command: string;

    if (binaryPath && fs.existsSync(binaryPath)) {
      // Use direct binary path - this works even when browser is already running
      if (isChromium) {
        const profileDir = resolveProfileDirectory(app, profile);
        command = `"${binaryPath}" --profile-directory="${profileDir}" "${url}"`;
      } else if (
        app.includes("firefox") ||
        appName.toLowerCase().includes("firefox")
      ) {
        command = `"${binaryPath}" -P "${profile}" "${url}"`;
      } else {
        command = `"${binaryPath}" --profile-directory="${profile}" "${url}"`;
      }
    } else {
      // Fallback to open -a (works when app is not running)
      if (isChromium) {
        const profileDir = resolveProfileDirectory(app, profile);
        command = `open -a "${appName}" --args --profile-directory="${profileDir}" "${url}"`;
      } else if (
        app.includes("firefox") ||
        appName.toLowerCase().includes("firefox")
      ) {
        command = `open -a "${appName}" --args -P "${profile}" "${url}"`;
      } else {
        command = `open -a "${appName}" --args --profile-directory="${profile}" "${url}"`;
      }
    }

    await execAsync(command);
  };

  const handleOpenInBrowser = async () => {
    try {
      if (targetApplication && targetProfile) {
        // Use shell command to open with specific profile
        await openWithProfile(targetApplication, targetProfile, link.url);
      } else if (targetApplication) {
        // Use Raycast's open with just the application
        await open(link.url, targetApplication);
      } else {
        // Use system default
        await open(link.url);
      }
    } catch (error) {
      // Fallback to system default browser if specified app/profile fails
      await showToast({
        style: Toast.Style.Animated,
        title: targetProfile
          ? `Could not open in ${targetApplication} (${targetProfile})`
          : `Could not open in ${targetApplication}`,
        message: "Falling back to default browser...",
      });
      await open(link.url);
    }
  };

  // Build accessories array for browser/profile info
  const accessories: List.Item.Accessory[] = [];
  if (targetApplication) {
    const shortName =
      BROWSER_SHORT_NAMES[targetApplication] || targetApplication;
    accessories.push({
      text: shortName,
      tooltip: `Browser: ${targetApplication}`,
    });
  }
  if (targetProfile) {
    accessories.push({
      text: targetProfile,
      tooltip: `Profile: ${targetProfile}`,
    });
  }

  return (
    <List.Item
      title={link.title}
      subtitle={link.url}
      keywords={link.keywords}
      icon={icon}
      accessories={accessories}
      actions={
        <ActionPanel>
          <Action
            icon={Icon.Globe}
            title={
              targetApplication && targetProfile
                ? `Open in ${targetApplication} (${targetProfile})`
                : targetApplication
                  ? `Open in ${targetApplication}`
                  : "Open in Browser"
            }
            onAction={handleOpenInBrowser}
          />
          <Action.CopyToClipboard
            content={link.url}
            title="Copy URL"
            shortcut={{ modifiers: ["cmd"], key: "c" }}
          />
          <Action.CopyToClipboard
            content={`[${link.title}](${link.url})`}
            title="Copy as Markdown"
            shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
          />
        </ActionPanel>
      }
    />
  );
}
