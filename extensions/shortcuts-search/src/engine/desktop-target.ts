import { getApplications } from "@raycast/api";
import type { Application } from "../model/internal/internal-models";
import { windowsProcessName } from "../app-matching";
import { getPlatform } from "../load/platform";
import type { ExecutionTarget } from "./execution-target";

export async function getDesktopTarget(app: Application): Promise<ExecutionTarget | undefined> {
  if (getPlatform() === "macos") return app.bundleId ? { kind: "desktop", bundleId: app.bundleId } : undefined;
  if (!app.windowsAppId && app.windowsProcessName)
    return { kind: "desktop", windowsProcessName: app.windowsProcessName };
  const installed = await getApplications();
  const processNames = installed
    .filter((native) =>
      app.windowsAppId ? native.windowsAppId === app.windowsAppId : native.name.toLowerCase() === app.name.toLowerCase()
    )
    .map(windowsProcessName)
    .filter((name) => name !== undefined);
  return processNames.length === 1 ? { kind: "desktop", windowsProcessName: processNames[0] } : undefined;
}
