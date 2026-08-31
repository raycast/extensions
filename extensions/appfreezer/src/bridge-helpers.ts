export const APPFREEZER_BUNDLE_ID = "com.chxsong.AppFreezer";

export interface InstalledApplication {
  bundleId?: string;
  path: string;
}

export type AgentAction = "pause" | "resume" | "resume-all" | "quit" | "force-quit";

export function locateAppFreezerPath(applications: readonly InstalledApplication[]): string | undefined {
  return applications.find((application) => application.bundleId === APPFREEZER_BUNDLE_ID)?.path;
}

export function buildActionURL(action: AgentAction | "settings", requestID?: string, id?: string): string {
  const url = new URL(`appfreezer://${action}`);
  if (requestID) url.searchParams.set("requestID", requestID);
  if (id) url.searchParams.set("id", id);
  return url.toString();
}
