import { List, Action, ActionPanel, showToast, Toast, closeMainWindow } from "@raycast/api";
import { useEffect, useState } from "react";
import { exec } from "child_process";
import util from "util";

const execPromise = util.promisify(exec);

/**
 * A small skip-list of system processes that might appear even with background only = false.
 */
const systemProcessNames = [
  "loginwindow",
  "notificationcenter",
  "systemuiserver",
  "windowserver",
  "rapportd",
  "lsd",
  "dock",
  // Add or remove entries as needed
];

/**
 * Capitalize the first letter of a string (e.g., "slack" => "Slack").
 */
function capitalizeFirstLetter(str: string) {
  if (!str) return str;
  return str[0].toUpperCase() + str.slice(1);
}

/**
 * Returns an array of objects, each with the `rawName` (unmodified),
 * a `displayName` (capitalized first letter), and a `path` to the .app file if available.
 *
 * This is similar to Cmd+Tab: only "application process" items whose "background only" is false.
 */
async function getCmdTabAppsWithPaths(): Promise<{ rawName: string; displayName: string; path: string }[]> {
  const script = String.raw`
    tell application "System Events"
      set appList to {}
      set allProcesses to every application process
      repeat with p in allProcesses
        try
          if background only of p is false then
            set theName to name of p
            try
              set thePath to POSIX path of application file of p
            on error
              set thePath to "PATH_NOT_FOUND"
            end try
            copy theName & "::" & thePath to the end of appList
          end if
        end try
      end repeat
      return appList
    end tell
  `;

  try {
    const { stdout } = await execPromise(`osascript -e '${script}'`);
    // Example: "Finder::/System/Library/CoreServices/Finder.app,Slack::/Applications/Slack.app"
    const rawEntries = stdout
      .trim()
      .split(",")
      .map((e) => e.trim())
      .filter((e) => e.length > 0);

    const results = rawEntries.map((entry) => {
      const [name, path] = entry.split("::");
      const rawName = (name ?? "").trim();
      const rawPath = (path ?? "").trim();

      return {
        rawName,
        displayName: capitalizeFirstLetter(rawName),
        path: rawPath,
      };
    });

    // Filter out known system processes
    return results.filter(({ rawName, path }) => {
      const lower = rawName.toLowerCase();
      // Skip if on skip-list or the path is missing
      if (systemProcessNames.includes(lower)) {
        return false;
      }
      if (path === "PATH_NOT_FOUND") {
        // Some user apps can trigger errors if they're ephemeral,
        // but typically PATH_NOT_FOUND means system process or weird background task
        return false;
      }
      return true;
    });
  } catch (error) {
    console.error(error);
    return [];
  }
}

/**
 * Hide a given app by setting its process's visibility to false.
 */
async function hideAppByName(appName: string) {
  const script = `
    tell application "System Events"
      set visible of process "${appName}" to false
    end tell
  `;
  await execPromise(`osascript -e '${script}'`);
}

export default function HideCommand() {
  const [apps, setApps] = useState<{ rawName: string; displayName: string; path: string }[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const list = await getCmdTabAppsWithPaths();
      setApps(list);
      setIsLoading(false);
    })();
  }, []);

  async function handleHide(appName: string) {
    try {
      await hideAppByName(appName);
      showToast(Toast.Style.Success, `Hid ${appName}`);
      await closeMainWindow();
    } catch (error) {
      console.error(error);
      showToast(Toast.Style.Failure, `Failed to hide ${appName}`);
    }
  }

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search for an open app ...">
      {apps.map(({ rawName, displayName, path }) => (
        <List.Item
          key={rawName}
          title={displayName}
          // Use fileIcon so the item shows the actual app icon
          icon={{ fileIcon: path }}
          actions={
            <ActionPanel>
              <Action title="Hide App" onAction={() => handleHide(rawName)} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
