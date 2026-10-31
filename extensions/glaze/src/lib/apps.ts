import { discoverApps } from "./app-discovery";
import { getProjectRoots, BUNDLED_APPS_DIRS } from "./paths";
export function scanApps() {
  return discoverApps(getProjectRoots(), BUNDLED_APPS_DIRS);
}
export async function getLocalProjects() {
  return (await scanApps()).filter((app) => app.variant === "local");
}
export async function getStoreInstalledApps() {
  // Store installs live in app bundles; unrelated project folders need not be readable.
  return (await discoverApps([], BUNDLED_APPS_DIRS)).filter(
    (app) => app.variant === "store",
  );
}
