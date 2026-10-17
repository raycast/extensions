import { LocalStorage } from "@raycast/api";

export interface HostGroup {
  id: string;
  name: string;
  patterns: string[];
  identityFiles: string[];
}

export type HostGroupOverrides = Record<string, string[]>;

const GROUPS_KEY = "host-groups";
const OVERRIDES_KEY = "host-group-overrides";
const LAST_FILTER_KEY = "last-group-filter";

const DEFAULT_GROUPS: HostGroup[] = [
  { id: "work", name: "Work", patterns: [], identityFiles: [] },
  { id: "personal", name: "Personal", patterns: [], identityFiles: [] },
];

export async function getGroups(): Promise<HostGroup[]> {
  const raw = await LocalStorage.getItem<string>(GROUPS_KEY);
  if (!raw) {
    await saveGroups(DEFAULT_GROUPS);
    return DEFAULT_GROUPS;
  }
  try {
    return JSON.parse(raw);
  } catch {
    return DEFAULT_GROUPS;
  }
}

export async function saveGroups(groups: HostGroup[]): Promise<void> {
  await LocalStorage.setItem(GROUPS_KEY, JSON.stringify(groups));
}

export async function addGroup(group: HostGroup): Promise<void> {
  const groups = await getGroups();
  groups.push(group);
  await saveGroups(groups);
}

export async function updateGroup(updated: HostGroup): Promise<void> {
  const groups = await getGroups();
  const idx = groups.findIndex((g) => g.id === updated.id);
  if (idx >= 0) groups[idx] = updated;
  await saveGroups(groups);
}

export async function deleteGroup(id: string): Promise<void> {
  const groups = await getGroups();
  await saveGroups(groups.filter((g) => g.id !== id));
  const overrides = await getHostOverrides();
  for (const host of Object.keys(overrides)) {
    overrides[host] = overrides[host].filter((gid) => gid !== id);
    if (overrides[host].length === 0) delete overrides[host];
  }
  await saveHostOverrides(overrides);
}

export async function getHostOverrides(): Promise<HostGroupOverrides> {
  const raw = await LocalStorage.getItem<string>(OVERRIDES_KEY);
  if (!raw) return {};
  try {
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

export async function saveHostOverrides(overrides: HostGroupOverrides): Promise<void> {
  await LocalStorage.setItem(OVERRIDES_KEY, JSON.stringify(overrides));
}

export async function setHostGroups(hostName: string, groupIds: string[]): Promise<void> {
  const overrides = await getHostOverrides();
  if (groupIds.length === 0) {
    delete overrides[hostName];
  } else {
    overrides[hostName] = groupIds;
  }
  await saveHostOverrides(overrides);
}

export async function getLastFilter(): Promise<string> {
  return (await LocalStorage.getItem<string>(LAST_FILTER_KEY)) || "all";
}

export async function setLastFilter(filter: string): Promise<void> {
  await LocalStorage.setItem(LAST_FILTER_KEY, filter);
}

function normalizeIdentityPath(p: string): string {
  let s = p.trim();
  s = s.replace(/^~\//, "");
  s = s.replace(/^.*[/\\]\.ssh[/\\]/, "");
  s = s.replace(/^\.ssh[/\\]/, "");
  return s;
}

function matchPattern(name: string, pattern: string): boolean {
  try {
    const escaped = pattern
      .replace(/[.+^${}()|[\]\\]/g, "\\$&")
      .replace(/\*/g, ".*")
      .replace(/\?/g, ".");
    return new RegExp("^" + escaped + "$").test(name);
  } catch {
    return name === pattern;
  }
}

export function classifyHostGroups(
  hostName: string,
  identityFile: string | undefined,
  groups: HostGroup[],
  overrides: HostGroupOverrides,
): string[] {
  try {
    const matched = new Set<string>();

    if (overrides[hostName]) {
      for (const gid of overrides[hostName]) {
        matched.add(gid);
      }
    }

    for (const group of groups) {
      if (group.patterns?.length > 0 && group.patterns.some((p) => matchPattern(hostName, p))) {
        matched.add(group.id);
      }

      if (identityFile && group.identityFiles?.length > 0) {
        const norm = normalizeIdentityPath(identityFile);
        if (group.identityFiles.some((f) => normalizeIdentityPath(f) === norm)) {
          matched.add(group.id);
        }
      }
    }

    return Array.from(matched);
  } catch (err) {
    console.error("classifyHostGroups error:", hostName, err);
    return [];
  }
}

export function generateGroupId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 7);
}
