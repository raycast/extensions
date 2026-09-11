import { Application, getApplications } from "@raycast/api";
import { getCurrentHandlersBatch } from "swift:../../swift";

export type HandlerInfo = {
  bundleID: string;
  app?: Application;
};

export async function fetchAppMap(): Promise<{
  apps: Application[];
  byBundleID: Map<string, Application>;
}> {
  const apps = await getApplications();
  const byBundleID = new Map<string, Application>();
  for (const app of apps) {
    if (app.bundleId) byBundleID.set(app.bundleId.toLowerCase(), app);
  }
  return { apps, byBundleID };
}

export async function fetchCurrentHandlers(
  exts: string[],
  byBundleID: Map<string, Application>,
): Promise<Map<string, HandlerInfo>> {
  const raw = (await getCurrentHandlersBatch(exts)) as Record<string, string>;
  const out = new Map<string, HandlerInfo>();
  for (const [ext, bundleID] of Object.entries(raw)) {
    out.set(ext, { bundleID, app: byBundleID.get(bundleID.toLowerCase()) });
  }
  return out;
}
