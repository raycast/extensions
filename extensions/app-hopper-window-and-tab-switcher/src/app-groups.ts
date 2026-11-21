import type { AppGroup, RunningAppMetadata, Window } from "./windows";
import { groupApplicationsBySpace } from "./app-space-groups";
import { getAppBrowser, type AppWindowData } from "./app-window-evidence";

export type AppListOrder = "recent" | "name" | "type" | "space";

export function arrangeApplications(apps: AppGroup[], order: AppListOrder, data: AppWindowData) {
  switch (order) {
    case "space":
      return groupApplicationsBySpace(apps, data);
    case "name":
      return [
        {
          id: "all",
          title: undefined,
          apps: [...apps].sort((a, b) =>
            a.name.localeCompare(b.name, undefined, { sensitivity: "base", numeric: true }),
          ),
        },
      ];
    case "type": {
      const browserApps = apps.filter((app) => getAppBrowser(app));
      const otherApps = apps.filter((app) => !getAppBrowser(app));
      return [
        { id: "browsers", title: "Browsers", apps: browserApps },
        { id: "applications", title: "Applications", apps: otherApps },
      ].filter((section) => section.apps.length > 0);
    }
    default:
      return [{ id: "all", title: undefined, apps }];
  }
}

/** All apps share one list; the same grouping is used for browsing and searching. */
export function groupApplications(
  windows: Window[],
  metadataByPid: Record<number, RunningAppMetadata>,
  applicationOrder: number[] = [],
  applications: RunningAppMetadata[] = [],
): AppGroup[] {
  const groups = new Map<string, AppGroup>();
  const applicationByPid = new Map(applications.map((app) => [app.pid, app]));
  for (const window of windows) {
    const metadata = metadataByPid[window.pid];
    const application = applicationByPid.get(window.pid);
    const bundlePath = metadata?.bundlePath || window.bundlePath || application?.bundlePath;
    const id = bundlePath ? `bundle:${bundlePath}` : `pid:${window.pid}`;
    let group = groups.get(id);
    if (!group) {
      group = {
        id,
        name: metadata?.localizedName || window.localizedName || application?.localizedName || window.app,
        bundlePath,
        pids: [],
        windows: [],
      };
      groups.set(id, group);
    }
    group.windows.push(window);
    if (!group.pids.includes(window.pid)) group.pids.push(window.pid);
  }
  for (const application of applications) {
    const id = application.bundlePath ? `bundle:${application.bundlePath}` : `pid:${application.pid}`;
    let group = groups.get(id);
    if (!group) {
      group = {
        id,
        name: application.localizedName || "Application",
        bundlePath: application.bundlePath,
        pids: [],
        windows: [],
      };
      groups.set(id, group);
    }
    if (!group.pids.includes(application.pid)) group.pids.push(application.pid);
    group.isHidden = group.isHidden === undefined ? application.isHidden : group.isHidden && application.isHidden;
  }

  const rankByPid = new Map(applicationOrder.map((pid, rank) => [pid, rank]));
  const appRank = (app: AppGroup) => Math.min(...app.pids.map((pid) => rankByPid.get(pid) ?? Infinity));
  const frontOrder = (app: AppGroup) => Math.min(...app.windows.map((window) => window.frontOrder ?? Infinity));
  return [...groups.values()].sort((a, b) => {
    const rankA = appRank(a),
      rankB = appRank(b);
    if (rankA !== rankB) return rankA - rankB;
    const frontA = frontOrder(a),
      frontB = frontOrder(b);
    return frontA === frontB ? 0 : frontA - frontB;
  });
}
