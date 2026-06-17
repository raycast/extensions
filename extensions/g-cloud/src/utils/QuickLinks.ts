import { CacheManager } from "./CacheManager";

export function initializeQuickLink(projectId: string): void {
  if (projectId) {
    CacheManager.ensureRecentlyUsedProjects();

    CacheManager.saveSelectedProject(projectId);
  }
}
