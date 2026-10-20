import { getPreferenceValues } from "@raycast/api";
import type { UpgradeOptions } from "../mise/operations";
import type { OutdatedOptions } from "../mise/outdated";

export type MisePreferences<T extends Preferences = Preferences> = Omit<T, "jobs"> & { jobs: number | undefined };

export function readPreferences<T extends Preferences = Preferences>(): MisePreferences<T> {
  const { jobs, ...rest } = getPreferenceValues<T>();
  return { ...rest, jobs: parseJobs(jobs) };
}

export function parseJobs(raw: string | undefined): number | undefined {
  const jobs = Number(raw?.trim());
  return Number.isInteger(jobs) && jobs > 0 ? jobs : undefined;
}

export function upgradeOptions(prefs: MisePreferences): UpgradeOptions {
  return { bump: prefs.upgradeBump, inactive: prefs.includeInactive, jobs: prefs.jobs };
}

export function outdatedOptions(prefs: MisePreferences): OutdatedOptions {
  return { bump: prefs.upgradeBump, inactive: prefs.includeInactive };
}
