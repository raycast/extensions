import { platformLabel } from "./platforms";
import type { Profile, ProfileGroup } from "./types";

/** Human name of the profile group a profile belongs to (or "Ungrouped"). */
export function groupNameFor(groups: ProfileGroup[], profileGroupId: string | null | undefined): string {
  return groups.find((g) => String(g.id) === String(profileGroupId))?.name ?? "Ungrouped";
}

export interface GroupedProfiles {
  id: string;
  name: string;
  profiles: Profile[];
}

/** Bucket profiles by their profile group, preserving first-seen order. */
export function groupProfiles(profiles: Profile[], groups: ProfileGroup[]): GroupedProfiles[] {
  const byKey = new Map<string, GroupedProfiles>();
  const order: string[] = [];
  for (const profile of profiles) {
    const name = groupNameFor(groups, profile.profile_group_id);
    const key = String(profile.profile_group_id ?? name);
    if (!byKey.has(key)) {
      byKey.set(key, { id: key, name, profiles: [] });
      order.push(key);
    }
    byKey.get(key)!.profiles.push(profile);
  }
  return order.map((key) => byKey.get(key)!);
}

/** One-line label for a profile in a picker. Include the id and/or group as needed. */
export function profileOptionTitle(profile: Profile, opts?: { showId?: boolean; group?: string }): string {
  const parts = [profile.name, platformLabel(profile.platform)];
  if (opts?.showId ?? true) parts.push(profile.id);
  if (opts?.group) parts.push(opts.group);
  return parts.join(" · ");
}
