import type { InstalledApp } from "./apps";
import type { Usage } from "./usage";

export type ViewKey = "name" | "size" | "lastUsed";

const DAY = 86_400_000;
const GB = 1024 ** 3;
const MB = 1024 ** 2;

export interface Bucket {
  title: string;
  apps: InstalledApp[];
}

/** Largest first, in bands, so the ones worth reclaiming lead. */
const SIZE_BANDS: { title: string; min: number }[] = [
  { title: "1 GB and up", min: GB },
  { title: "100 MB – 1 GB", min: 100 * MB },
  { title: "10 – 100 MB", min: 10 * MB },
  { title: "Under 10 MB", min: 0 },
];

/** Oldest first: the top of this list is what is safe to reclaim. */
const AGE_BANDS: { title: string; minDays: number }[] = [
  { title: "Over a year ago", minDays: 365 },
  { title: "6 – 12 months ago", minDays: 182 },
  { title: "1 – 6 months ago", minDays: 30 },
  { title: "Within the last month", minDays: 0 },
];

function bucketed(
  bands: { title: string }[],
  assign: (app: InstalledApp) => number,
): (apps: InstalledApp[]) => Bucket[] {
  return (apps) => {
    const groups: InstalledApp[][] = bands.map(() => []);
    for (const app of apps) {
      // A band table is meant to be exhaustive, but an app matching none of them
      // must still land somewhere: indexing with -1 throws and takes the whole
      // view down with it.
      const index = assign(app);
      groups[index >= 0 ? index : bands.length - 1].push(app);
    }
    return bands.map((band, index) => ({ title: band.title, apps: groups[index] })).filter((b) => b.apps.length > 0);
  };
}

/**
 * Group the applications for a view.
 *
 * `name` is a flat alphabetical list. The other two are banded, because the
 * useful question is not the exact ordering but which apps fall in the band
 * worth acting on — the large ones, or the ones untouched for a year.
 */
export function groupApps(
  view: ViewKey,
  apps: InstalledApp[],
  sizes: Record<string, number>,
  usage: Record<string, Usage>,
): Bucket[] {
  if (view === "name") {
    return [{ title: "", apps }];
  }

  if (view === "size") {
    const ordered = [...apps].sort(
      (a, b) => (sizes[b.path] ?? 0) - (sizes[a.path] ?? 0) || a.name.localeCompare(b.name),
    );
    return bucketed(SIZE_BANDS, (app) => {
      const size = sizes[app.path] ?? 0;
      return SIZE_BANDS.findIndex((band) => size >= band.min);
    })(ordered);
  }

  // Never-used apps lead: nothing on disk suggests they have ever been opened.
  const never = apps.filter((app) => !(usage[app.path]?.lastUsed > 0));
  const known = apps
    .filter((app) => usage[app.path]?.lastUsed > 0)
    .sort((a, b) => (usage[a.path]?.lastUsed ?? 0) - (usage[b.path]?.lastUsed ?? 0));

  const banded = bucketed(AGE_BANDS, (app) => {
    // Clamped at zero: a timestamp in the future — clock skew, or a file
    // restored from an archive — would otherwise match no band at all.
    const days = Math.max(0, Date.now() - (usage[app.path]?.lastUsed ?? 0)) / DAY;
    return AGE_BANDS.findIndex((band) => days >= band.minDays);
  })(known);

  return never.length > 0
    ? [{ title: "No sign of ever being used", apps: never.sort((a, b) => a.name.localeCompare(b.name)) }, ...banded]
    : banded;
}
