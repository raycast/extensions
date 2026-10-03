import { getApplications } from "@raycast/api";
import type { Application } from "../model/internal/internal-models";
import { windowsProcessName } from "../app-matching";
import { getPlatform } from "../load/platform";
import type { ExecutionTarget } from "./execution-target";

export async function getDesktopTarget(app: Application): Promise<ExecutionTarget | undefined> {
  if (getPlatform() === "macos") return app.bundleId ? { kind: "desktop", bundleId: app.bundleId } : undefined;
  if (app.windowsProcessName) return { kind: "desktop", windowsProcessName: app.windowsProcessName };
  const installed = await getApplications();
  const matches = installed.filter((native) =>
    app.windowsAppId ? native.windowsAppId === app.windowsAppId : native.name.toLowerCase() === app.name.toLowerCase()
  );
  if (matches.length !== 1) return undefined;
  const processName = windowsProcessName(matches[0]);
  return processName ? { kind: "desktop", windowsProcessName: processName } : undefined;
}
