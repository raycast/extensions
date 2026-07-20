import { Application, Icon, Image } from "@raycast/api";
import { execFile } from "child_process";

export interface AppDescriptor {
  name: string;
  bundleId?: string;
}

export function findInstalledApp(
  installedApps: Application[] | undefined,
  app: AppDescriptor,
): Application | undefined {
  if (!installedApps) {
    return undefined;
  }

  if (app.bundleId) {
    const byBundleId = installedApps.find((installedApp) => installedApp.bundleId === app.bundleId);
    if (byBundleId) {
      return byBundleId;
    }
  }

  return installedApps.find(
    (installedApp) => installedApp.name === app.name || installedApp.localizedName === app.name,
  );
}

export function getAppIcon(installedApps: Application[] | undefined, app: AppDescriptor): Image.ImageLike {
  const installedApp = findInstalledApp(installedApps, app);
  return installedApp ? { fileIcon: installedApp.path } : Icon.AppWindow;
}

export function buildOpenApplicationArgs(app: AppDescriptor, installedApps: Application[] | undefined): string[] {
  if (app.bundleId) {
    return ["-b", app.bundleId];
  }

  const installedApp = findInstalledApp(installedApps, app);
  if (installedApp) {
    return [installedApp.path];
  }

  throw new Error(`Unable to determine how to open "${app.name}"`);
}

export function openApplicationAsync(app: AppDescriptor, installedApps: Application[] | undefined): Promise<void> {
  const args = buildOpenApplicationArgs(app, installedApps);
  return new Promise((resolve, reject) => {
    execFile("open", args, (error) => {
      if (error) {
        reject(error);
      } else {
        resolve();
      }
    });
  });
}
