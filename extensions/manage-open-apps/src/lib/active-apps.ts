import { type Application, getApplications } from "@raycast/api";
import { activeApplicationsAppleScript, applicationIconAppleScript } from "./apple-scripts";
import { runAppleScript } from "run-applescript";
import { getAvatarIcon } from "@raycast/utils";

export type ActiveApplication = {
  name: string;
  icon: string;
};

export const getActiveApplications = async () => {
  const scriptOutput = await runAppleScript(activeApplicationsAppleScript());
  const installedApps = await getApplications();

  const installedAppsLookup = new Map<string, Application>();
  const activeApplications: ActiveApplication[] = [];

  for (const app of installedApps) {
    installedAppsLookup.set(app.bundleId!, app);
  }

  for (const activeApp of formatScriptOutput(scriptOutput)) {
    const installedApp = installedAppsLookup.get(activeApp.bundleId);

    if (!installedApp) {
      continue;
    }

    try {
      const icon = await runAppleScript(applicationIconAppleScript(installedApp.path));

      activeApplications.push({
        icon,
        name: installedApp.name,
      });
    } catch (e) {
      console.error(`applicationsIconAppleScript -> ${activeApp.name} -> ${e}`);

      activeApplications.push({
        name: installedApp.name,
        icon: getAvatarIcon(activeApp.name),
      });
    }
  }

  return activeApplications;
};

const formatScriptOutput = (scriptOutput: string) => {
  const entries = scriptOutput.split(", ");
  const formattedOutput = [];

  for (let i = 0; i < entries.length; i += 3) {
    const name = entries[i].split(":")[1];
    const bundleId = entries[i + 1].split(":")[1];
    const path = entries[i + 2].split(":")[1];
    formattedOutput.push({ name, bundleId, path });
  }

  return formattedOutput;
};
