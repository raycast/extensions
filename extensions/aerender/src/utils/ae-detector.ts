import { readdirSync, existsSync, accessSync, constants, statSync } from "node:fs";
import { join } from "node:path";

export interface AEVersion {
  name: string;
  version: string;
  path: string;
  aerenderPath: string;
}

function findAerender(appPath: string): string | null {
  const possiblePaths = [
    join(appPath, "aerender"),
    join(appPath, "Support Files", "aerender"),
    join(appPath, "MacOS", "aerender"),
  ];

  for (const path of possiblePaths) {
    if (existsSync(path)) {
      try {
        const stats = statSync(path);
        if (stats.isFile()) {
          accessSync(path, constants.X_OK);
          return path;
        }
      } catch {
        continue;
      }
    }
  }

  return null;
}

export function detectAfterEffectsVersions(): AEVersion[] {
  const applicationsPath = "/Applications";
  const versions: AEVersion[] = [];

  try {
    const apps = readdirSync(applicationsPath);

    apps.forEach((app) => {
      if (app.startsWith("Adobe After Effects")) {
        const appPath = join(applicationsPath, app);
        const aerenderPath = findAerender(appPath);

        if (aerenderPath) {
          const versionMatch = app.match(/(\d{4})/);
          const version = versionMatch ? versionMatch[1] : "Unknown";

          versions.push({
            name: app,
            version,
            path: appPath,
            aerenderPath,
          });
        }
      }
    });

    versions.sort((a, b) => b.version.localeCompare(a.version));
    return versions;
  } catch (error) {
    console.error("Error detecting AE versions:", error);
    return [];
  }
}

export function getRandomRenderMessage(): string {
  const messages = [
    "Starting render...",
    "Preparing render...",
    "Initializing render sequence...",
    "Processing render...",
    "Render starting...",
    "Beginning render...",
    "Launching render...",
    "Commencing render...",
    "Starting render process...",
    "Preparing to render...",
    "Initiating render...",
    "Beginning render process...",
  ];
  return messages[Math.floor(Math.random() * messages.length)];
}

export function getCompletionMessage(): string {
  const messages = [
    "Render Complete",
    "Render Successful",
    "Render Finished",
    "Completed Successfully",
    "Render Done",
    "Successfully Rendered",
    "Render Process Complete",
    "Completed",
    "Finished Rendering",
    "Render Completed Successfully",
    "Done",
    "Render Process Finished",
  ];
  return messages[Math.floor(Math.random() * messages.length)];
}
