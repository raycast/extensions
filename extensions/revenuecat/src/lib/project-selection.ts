import { Cache, LocalStorage } from "@raycast/api";

export const SELECTED_PROJECT_KEY = "selectedProjectId";
const selectionCache = new Cache({ namespace: "project-selection" });

// All project pickers update this synchronous mirror so menu bar commands can
// render the right cached value immediately after Raycast restarts them.
export function cachedSelectedProject(): string | undefined {
  return selectionCache.get(SELECTED_PROJECT_KEY);
}
export async function selectedProject(): Promise<string | undefined> {
  const cached = cachedSelectedProject();
  if (cached) return cached;
  const saved = await LocalStorage.getItem<string>(SELECTED_PROJECT_KEY);
  // A picker may have changed selection while the migration read was pending.
  const id = cachedSelectedProject() ?? saved;
  if (id) selectionCache.set(SELECTED_PROJECT_KEY, id);
  else selectionCache.remove(SELECTED_PROJECT_KEY);
  return id;
}
export async function saveSelectedProject(id: string): Promise<void> {
  await LocalStorage.setItem(SELECTED_PROJECT_KEY, id);
  selectionCache.set(SELECTED_PROJECT_KEY, id);
}
