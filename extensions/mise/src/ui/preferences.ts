import { getPreferenceValues } from "@raycast/api";
import type { MiseLocation } from "../mise/locate";
import type { UpgradeOptions } from "../mise/operations";
import { GLOBAL_FLAG_SINCE, type OutdatedOptions } from "../mise/outdated";
import { atLeast } from "../mise/version";

export type MisePreferences<T extends Preferences = Preferences> = Omit<T, "jobs"> & { jobs: number | undefined };

export function readPreferences<T extends Preferences = Preferences>(): MisePreferences<T> {
  const { jobs, ...rest } = getPreferenceValues<T>();
  return { ...rest, jobs: parseJobs(jobs) };
}

export function parseJobs(raw: string | undefined): number | undefined {
  const jobs = Number(raw?.trim());
  return Number.isInteger(jobs) && jobs > 0 ? jobs : undefined;
}

export function upgradeOptions(prefs: MisePreferences, location: MiseLocation): UpgradeOptions {
  return { ...outdatedOptions(prefs, location), jobs: prefs.jobs };
}

export function outdatedOptions(prefs: MisePreferences, location: MiseLocation): OutdatedOptions {
  return {
    global: !prefs.includeInactive && atLeast(location.version, GLOBAL_FLAG_SINCE),
    bump: prefs.upgradeBump,
    inactive: prefs.includeInactive,
  };
}
