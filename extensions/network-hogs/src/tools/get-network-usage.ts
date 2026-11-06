import { getApplications } from "@raycast/api";
import { sampleNetwork } from "../lib/monitor";
import { sortApps, visibleApps } from "../lib/usage";
import { preferences } from "../preferences";
import type { SortBy } from "../types";

type Input = {
  /** Sort by download, upload, or combined traffic. Defaults to combined. */
  sortBy?: SortBy;
  /** Number of apps to return, from 1 to 20. Defaults to 5. */
  limit?: number;
};

/** Observe current per-app network traffic for one second. Read-only; cannot quit or change apps. */
export default async function getNetworkUsage(input: Input) {
  const snapshot = await sampleNetwork(getApplications());
  const prefs = preferences();
  const limit = Number.isFinite(input.limit) ? Math.min(20, Math.max(1, Math.trunc(input.limit ?? 5))) : 5;
  const apps = sortApps(visibleApps(snapshot, prefs.hideSystemDaemons), input.sortBy).slice(0, limit);
  return {
    sampledAt: new Date(snapshot.timestamp).toISOString(),
    sampleDurationSeconds: snapshot.sampledSeconds,
    totalsScope: "This fresh observation only. These are not totals from the open Network Hogs command or since login.",
    rateUnit: "bytes/second",
    systemDaemonsHidden: prefs.hideSystemDaemons,
    limitations: [
      "Traffic usage does not measure connection capacity or prove why the internet is slow.",
      "Shared macOS services cannot always be attributed to one app; VPN and app traffic may overlap.",
      "A process first seen in the final sample has no rate yet. Sample again if an app has just started.",
    ],
    apps: apps.map((app) => ({
      name: app.name,
      downloadBytesPerSecond: app.downloadBps,
      uploadBytesPerSecond: app.uploadBps,
      observedDownloadBytes: app.downloadedBytes,
      observedUploadBytes: app.uploadedBytes,
      processIds: app.processes.map((info) => info.pid),
      note: app.note,
    })),
  };
}
