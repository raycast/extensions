import { Application, getApplications } from "@raycast/api";

export interface BadgerApplication extends Application {
  bundleId: string;
  active: boolean;
  attn: boolean;
  count: number;
  enabled: boolean;
}

export function sortApps(apps: BadgerApplication[]) {
  return apps.sort((a, b) =>
    a.name.localeCompare(b.name, Intl.DateTimeFormat().resolvedOptions().locale, {
      sensitivity: "base",
    }),
  );
}

async function getBadgerApps() {
  return sortApps((await getApplications()).filter((app) => app.bundleId) as BadgerApplication[]);
}

export default getBadgerApps;
