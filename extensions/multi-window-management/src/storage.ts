import { LocalStorage } from "@raycast/api";
import { WindowGroup, GroupsStorage } from "./types";

const STORAGE_KEY = "window-groups";

/**
 * Load all saved window groups
 */
export async function loadGroups(): Promise<WindowGroup[]> {
  try {
    const data = await LocalStorage.getItem<string>(STORAGE_KEY);
    if (!data) {
      return [];
    }
    const storage: GroupsStorage = JSON.parse(data);
    return storage.groups || [];
  } catch (error) {
    console.error("Error loading groups:", error);
    return [];
  }
}

/**
 * Save window groups to storage
 */
export async function saveGroups(groups: WindowGroup[]): Promise<void> {
  try {
    const storage: GroupsStorage = { groups };
    await LocalStorage.setItem(STORAGE_KEY, JSON.stringify(storage));
  } catch (error) {
    console.error("Error saving groups:", error);
    throw error;
  }
}

/**
 * Create a new window group
 */
export async function createGroup(group: Omit<WindowGroup, "id" | "createdAt" | "updatedAt">): Promise<WindowGroup> {
  const groups = await loadGroups();

  const newGroup: WindowGroup = {
    ...group,
    id: Date.now().toString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  groups.push(newGroup);
  await saveGroups(groups);

  return newGroup;
}

/**
 * Update an existing window group
 */
export async function updateGroup(id: string, updates: Partial<WindowGroup>): Promise<void> {
  const groups = await loadGroups();
  const index = groups.findIndex((g) => g.id === id);

  if (index === -1) {
    throw new Error("Group not found");
  }

  groups[index] = {
    ...groups[index],
    ...updates,
    updatedAt: new Date().toISOString(),
  };

  await saveGroups(groups);
}

/**
 * Delete a window group
 */
export async function deleteGroup(id: string): Promise<void> {
  const groups = await loadGroups();
  const filteredGroups = groups.filter((g) => g.id !== id);
  await saveGroups(filteredGroups);
}

/**
 * Get a single group by ID
 */
export async function getGroup(id: string): Promise<WindowGroup | null> {
  const groups = await loadGroups();
  return groups.find((g) => g.id === id) || null;
}
