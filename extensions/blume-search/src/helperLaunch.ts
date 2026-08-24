import { existsSync } from "node:fs";
import { basename, join } from "node:path";

export interface InstalledApplication {
  name: string;
  path: string;
  bundleId?: string;
}

export interface BlumeHelperLaunch {
  command: string;
  args: string[];
  env: NodeJS.ProcessEnv;
}

export function helperLaunchForApplication(application: InstalledApplication): BlumeHelperLaunch {
  const resources = join(application.path, "Contents", "Resources");
  const helper = join(resources, "app.asar", "out", "main", "raycastSearch.js");
  const executableNames = Array.from(
    new Set([application.name, basename(application.path, ".app"), "Blume", "Blume Canary"]),
  );
  const command = executableNames.map((name) => join(application.path, "Contents", "MacOS", name)).find(existsSync);

  if (!command || !existsSync(helper)) {
    throw new Error(`${application.name} does not include Raycast search yet. Update Blume and try again.`);
  }
  return {
    command,
    args: [helper],
    env: { ...process.env, ELECTRON_RUN_AS_NODE: "1" },
  };
}
