import { LocalStorage } from "@raycast/api";
import { runAppleScript } from "@raycast/utils";
import { exec } from "node:child_process";

export const closeAll = async () => {
  return await runAppleScript(`
		tell application "System Events"
			set open_apps to name of (every process whose background only is false)
			return open_apps
		end tell
	`);
};

export const getOpenApps = async (): Promise<string[]> => {
  const openApps = await runAppleScript(`
		tell application "System Events"
			set open_apps to name of (every process whose background only is false)
			return open_apps
		end tell
	`);

  const systemWhitelistSet = new Set(systemWhitelist);

  const apps = Array.from(
    new Set(
      openApps
        .split(",")
        .map((app) => app.replace(/\.app$/, "").trim())
        .filter((app) => !systemWhitelistSet.has(app)),
    ),
  );
  return apps;
};

export const getAllApps = async (): Promise<string[]> => {
  return new Promise((resolve, reject) => {
    exec("ls /Applications /System/Applications | grep '.app$' | sed 's/\\.app$//'", (error, stdout, stderr) => {
      if (error) {
        reject(`Error: ${stderr}`);
        return;
      }
      const appNames = Array.from(
        new Set(
          stdout
            .split("\n")
            .filter(Boolean)
            .sort((a, b) => a.localeCompare(b)),
        ),
      );
      resolve(appNames);
    });
  });
};

export const closeNotWhitelisted = async () => {
  const whitelistedApps = await LocalStorage.getItem<string>("whitelistedApps");

  if (!whitelistedApps) {
    return;
  }

  const whitelistedAppsArray = JSON.parse(whitelistedApps.replace(/'/g, '"'));

  const whitelistedAppsFormatted = convertStringToAppleScriptFormat(JSON.stringify(whitelistedAppsArray));
  const systemWhitelistFormatted = systemWhitelist.map((app) => `"${app}"`).join(", ");

  const script = `
	set allowedApps to {${whitelistedAppsFormatted}, ${systemWhitelistFormatted}}
	tell application "System Events"
	set activeApps to name of (every process whose background only is false)
	end tell
	
	repeat with appName in activeApps
		if (allowedApps does not contain appName) and (appName is not "Finder") then
			try
				tell application appName
					quit
				end tell
			on error
				error "An error occurred while trying to quit " & appName
			end try
		end if
	end repeat
	`;
  return await runAppleScript(script, { timeout: 30000 });
};

function convertStringToAppleScriptFormat(input: string): string {
  const array = JSON.parse(input.replace(/'/g, '"'));

  return array.map((app: string) => `"${app.trim()}"`).join(", ");
}

const systemWhitelist = ["Raycast", "Finder", "Electron", "stable", "osascript"];
