import type { ProcessRow, Snapshot } from "./model";

export type TrackingScope = "apps" | "third-party" | "all";
export type ResourceClass = "system" | "apple-app" | "user" | "unknown";
type Identity = Pick<ProcessRow, "executable" | "appPath" | "bundleId">;

export function resourceClass(identity: Identity): ResourceClass {
  const executable = identity.executable;
  // Use the executable's own bundle, not an ancestor such as Terminal. A Node
  // server launched from Terminal is still a development process we must show.
  const app = executable.match(/^.*?\.app(?=\/|$)/)?.[0];
  // These are user-facing Apple apps, including Safari's system cryptex location.
  if (app && /^\/System\/(?:Cryptexes\/App\/System\/)?Applications\//.test(app))
    return "apple-app";
  const systemLocation = (path: string) =>
    [
      "/System/",
      "/usr/lib/",
      "/usr/libexec/",
      "/usr/sbin/",
      "/sbin/",
      "/Library/Apple/",
    ].some((prefix) => path.startsWith(prefix));
  if (systemLocation(executable) || (app && systemLocation(app)))
    return "system";
  if (
    app &&
    (!identity.appPath || identity.appPath === app) &&
    identity.bundleId?.startsWith("com.apple.")
  )
    return identity.bundleId.startsWith("com.apple.dt.") ? "user" : "apple-app";
  // Shells, Git, interpreters, and other /bin or /usr/bin tools remain useful
  // development targets. Names alone and another user's UID are not classifiers.
  return executable || app ? "user" : "unknown";
}

export function included(category: ResourceClass, scope: TrackingScope) {
  return (
    scope === "all" ||
    category === "user" ||
    (scope === "apps" && category === "apple-app")
  );
}

export function trackedSnapshot(
  snapshot: Snapshot,
  scope: TrackingScope,
): Snapshot {
  return {
    ...snapshot,
    processes: snapshot.processes
      .filter((process) => included(resourceClass(process), scope))
      .map((process) => {
        if (
          !process.appPath ||
          included(
            resourceClass({
              executable: process.appPath,
              appPath: process.appPath,
              bundleId: process.bundleId,
            }),
            scope,
          )
        )
          return process;
        // Keep external child tools individually, without recreating their hidden
        // system/Apple parent as an app aggregate consisting only of these tools.
        const {
          appPath,
          appName,
          appPid,
          appBlockedReason,
          bundleId,
          ...standalone
        } = process;
        void [appPath, appName, appPid, appBlockedReason, bundleId];
        return standalone;
      }),
  };
}

export function historyClass(row: {
  key: string;
  kind: string;
  category?: ResourceClass;
}): ResourceClass {
  if (row.kind === "container") return "user";
  if (row.category && row.category !== "unknown") return row.category;
  // Old app keys contain their installation path; old process keys contain only
  // boot/PID/start and cannot safely be classified from the process name.
  if (row.kind === "app" && row.key.startsWith("app:")) {
    const path = row.key.slice(4);
    if (path.startsWith("/")) {
      const category = resourceClass({ executable: path, appPath: path });
      // A non-system path alone cannot distinguish a moved Apple app from a
      // third-party app. A new classified sample will identify this history key.
      if (category !== "user") return category;
    }
  }
  return "unknown";
}

export const scopeLabel: Record<TrackingScope, string> = {
  apps: "macOS services excluded · Apple apps included",
  "third-party": "macOS services and built-in Apple apps excluded",
  all: "All resources included",
};
