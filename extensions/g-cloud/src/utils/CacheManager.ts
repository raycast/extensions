import { Cache } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import fs from "fs";
import { homedir } from "os";
import { join } from "path";

export const CACHE_KEYS = {
  AUTH_STATUS: "auth-status",
  AUTH_USER: "auth-user",
  AUTH_TIMESTAMP: "auth-timestamp",
  SELECTED_PROJECT: "selected-project",
  PROJECT_TIMESTAMP: "project-timestamp",
  PROJECTS_LIST: "projects-list",
  PROJECTS_LIST_TIMESTAMP: "projects-list-timestamp",
  RECENTLY_USED_PROJECTS: "recently-used-projects",
};

export const CACHE_TTL = {
  AUTH: 72 * 60 * 60 * 1000,
  PROJECT: 72 * 60 * 60 * 1000,
  PROJECTS_LIST: 6 * 60 * 60 * 1000,
};

const PREFS_FILE_PATH = join(homedir(), ".raycast-gcloud-prefs.json");

const cache = new Cache({ namespace: "gcloud-cache" });

const settingsCache = new Cache({ namespace: "settings" });

export interface Project {
  id: string;
  name: string;
  projectNumber: string;
  createTime?: string;
}

export interface CachedAuth {
  isAuthenticated: boolean;
  user: string;
  timestamp: number;
}

export interface CachedProject {
  projectId: string;
  timestamp: number;
}

export interface CachedProjectsList {
  projects: Project[];
  timestamp: number;
}

export class CacheManager {
  static saveAuthStatus(isAuthenticated: boolean, user: string): void {
    cache.set(CACHE_KEYS.AUTH_STATUS, isAuthenticated.toString());
    cache.set(CACHE_KEYS.AUTH_USER, user);
    cache.set(CACHE_KEYS.AUTH_TIMESTAMP, Date.now().toString());
  }

  static getAuthStatus(): CachedAuth | null {
    const isAuthenticatedStr = cache.get(CACHE_KEYS.AUTH_STATUS);
    const user = cache.get(CACHE_KEYS.AUTH_USER);
    const timestampStr = cache.get(CACHE_KEYS.AUTH_TIMESTAMP);

    if (!isAuthenticatedStr || !timestampStr) {
      return null;
    }

    const isAuthenticated = isAuthenticatedStr === "true";
    const timestamp = parseInt(timestampStr, 10);

    if (Date.now() - timestamp > CACHE_TTL.AUTH) {
      return null;
    }

    return { isAuthenticated, user: user || "", timestamp };
  }

  static updateAuthCacheDuration(hours: number): void {
    settingsCache.set("auth-cache-duration", hours.toString());
  }

  static clearAuthCache(): void {
    cache.remove(CACHE_KEYS.AUTH_STATUS);
    cache.remove(CACHE_KEYS.AUTH_USER);
    cache.remove(CACHE_KEYS.AUTH_TIMESTAMP);
  }

  static getCacheLimit(): number {
    const cachedLimit = settingsCache.get("cache-limit");
    return cachedLimit ? parseInt(cachedLimit, 10) : 1;
  }

  static saveSelectedProject(projectId: string): void {
    if (!projectId || typeof projectId !== "string") {
      console.error("Invalid project ID provided to saveSelectedProject:", projectId);
      return;
    }

    const now = Date.now();

    cache.set(CACHE_KEYS.SELECTED_PROJECT, projectId);
    cache.set(CACHE_KEYS.PROJECT_TIMESTAMP, now.toString());

    const cacheLimit = CacheManager.getCacheLimit();
    const recentlyUsedStr = cache.get(CACHE_KEYS.RECENTLY_USED_PROJECTS);
    let recentlyUsed: string[] = recentlyUsedStr ? JSON.parse(recentlyUsedStr) : [];

    recentlyUsed = recentlyUsed.filter((id) => id !== projectId);

    recentlyUsed.unshift(projectId);

    if (recentlyUsed.length > cacheLimit) {
      recentlyUsed = recentlyUsed.slice(0, cacheLimit);
    }

    recentlyUsed = [...new Set(recentlyUsed)];

    cache.set(CACHE_KEYS.RECENTLY_USED_PROJECTS, JSON.stringify(recentlyUsed));

    try {
      fs.writeFileSync(
        PREFS_FILE_PATH,
        JSON.stringify({
          projectId,
          recentlyUsed,
          timestamp: now,
        }),
      );
    } catch (error) {
      console.error("Failed to save project to preferences file:", error);
      showFailureToast("Failed to save project preferences", {
        message: error instanceof Error ? error.message : "Unknown error occurred while saving preferences",
      });
    }
  }

  static getSelectedProject(): CachedProject | null {
    const projectId = cache.get(CACHE_KEYS.SELECTED_PROJECT);
    const timestampStr = cache.get(CACHE_KEYS.PROJECT_TIMESTAMP);

    if (projectId && timestampStr) {
      const timestamp = parseInt(timestampStr, 10);

      if (Date.now() - timestamp <= CACHE_TTL.PROJECT) {
        return { projectId, timestamp };
      }
    }

    try {
      if (fs.existsSync(PREFS_FILE_PATH)) {
        const prefsData = JSON.parse(fs.readFileSync(PREFS_FILE_PATH, "utf8"));
        if (prefsData.projectId && prefsData.timestamp) {
          if (Date.now() - prefsData.timestamp <= CACHE_TTL.PROJECT) {
            cache.set(CACHE_KEYS.SELECTED_PROJECT, prefsData.projectId);
            cache.set(CACHE_KEYS.PROJECT_TIMESTAMP, prefsData.timestamp.toString());

            if (prefsData.recentlyUsed && Array.isArray(prefsData.recentlyUsed)) {
              cache.set(CACHE_KEYS.RECENTLY_USED_PROJECTS, JSON.stringify(prefsData.recentlyUsed));
            }

            return { projectId: prefsData.projectId, timestamp: prefsData.timestamp };
          }
        }
      }
    } catch (error) {
      console.error("Failed to load project from preferences file:", error);
      showFailureToast("Failed to load project preferences", {
        message: error instanceof Error ? error.message : "Unknown error occurred while loading preferences",
      });
    }

    return null;
  }

  static getRecentlyUsedProjects(): string[] {
    const recentlyUsedStr = cache.get(CACHE_KEYS.RECENTLY_USED_PROJECTS);
    if (recentlyUsedStr) {
      try {
        return JSON.parse(recentlyUsedStr);
      } catch (error) {
        console.error("Failed to parse recently used projects:", error);
        showFailureToast("Failed to parse recently used projects", {
          message: error instanceof Error ? error.message : "Invalid data format in cache",
        });
      }
    }

    try {
      if (fs.existsSync(PREFS_FILE_PATH)) {
        const prefsData = JSON.parse(fs.readFileSync(PREFS_FILE_PATH, "utf8"));
        if (prefsData.recentlyUsed && Array.isArray(prefsData.recentlyUsed)) {
          cache.set(CACHE_KEYS.RECENTLY_USED_PROJECTS, JSON.stringify(prefsData.recentlyUsed));
          return prefsData.recentlyUsed;
        }
      }
    } catch (error) {
      console.error("Failed to load recently used projects from preferences file:", error);
      showFailureToast("Failed to load recently used projects", {
        message: error instanceof Error ? error.message : "Unknown error occurred while loading preferences",
      });
    }

    return [];
  }

  static clearProjectCache(): void {
    cache.remove(CACHE_KEYS.SELECTED_PROJECT);
    cache.remove(CACHE_KEYS.PROJECT_TIMESTAMP);
    cache.remove(CACHE_KEYS.RECENTLY_USED_PROJECTS);
  }

  static saveProjectsList(projects: Project[]): void {
    if (!Array.isArray(projects)) {
      console.error("Invalid projects array provided to saveProjectsList:", projects);
      return;
    }

    const validProjects = projects.filter((project) => project && project.id);

    cache.set(CACHE_KEYS.PROJECTS_LIST, JSON.stringify(validProjects));
    cache.set(CACHE_KEYS.PROJECTS_LIST_TIMESTAMP, Date.now().toString());
  }

  static getProjectsList(): CachedProjectsList | null {
    const projectsListStr = cache.get(CACHE_KEYS.PROJECTS_LIST);
    const timestampStr = cache.get(CACHE_KEYS.PROJECTS_LIST_TIMESTAMP);

    if (!projectsListStr || !timestampStr) {
      return null;
    }

    const timestamp = parseInt(timestampStr, 10);

    if (Date.now() - timestamp > CACHE_TTL.PROJECTS_LIST) {
      return null;
    }

    try {
      const projects = JSON.parse(projectsListStr);
      return { projects, timestamp };
    } catch (error) {
      console.error("Failed to parse cached projects list:", error);
      return null;
    }
  }

  static clearProjectsListCache(): void {
    cache.remove(CACHE_KEYS.PROJECTS_LIST);
    cache.remove(CACHE_KEYS.PROJECTS_LIST_TIMESTAMP);
  }

  static clearAllCaches(): void {
    CacheManager.clearAuthCache();
    CacheManager.clearProjectCache();
    CacheManager.clearProjectsListCache();
  }

  static saveRecentlyUsedProjects(projectIds: string[]): void {
    cache.set(CACHE_KEYS.RECENTLY_USED_PROJECTS, JSON.stringify(projectIds));
  }

  static async getProjectDetails(projectId: string, gcloudPath: string): Promise<Project | null> {
    if (!projectId || typeof projectId !== "string" || !gcloudPath) {
      console.error("Invalid parameters in getProjectDetails:", { projectId, gcloudPath });
      showFailureToast("Invalid parameters", {
        message: "Project ID and gcloud path are required",
      });
      return null;
    }

    try {
      const projectCache = new Cache({ namespace: "project-details" });
      const cachedDetailsStr = projectCache.get(`project-${projectId}`);
      const timestampStr = projectCache.get(`project-${projectId}-timestamp`);

      if (cachedDetailsStr && timestampStr) {
        const timestamp = parseInt(timestampStr, 10);

        if (Date.now() - timestamp <= CACHE_TTL.PROJECT) {
          try {
            const cachedDetails = JSON.parse(cachedDetailsStr);
            return {
              id: cachedDetails.projectId,
              name: cachedDetails.name || cachedDetails.projectId,
              projectNumber: cachedDetails.projectNumber || "",
              createTime: cachedDetails.createTime || new Date().toISOString(),
            };
          } catch (error) {
            console.error("Error parsing cached project details:", error);
            showFailureToast("Cache error", {
              message: "Failed to parse cached project details",
            });
          }
        }
      }

      try {
        const { executeGcloudCommand } = await import("../gcloud");
        const result = await executeGcloudCommand(gcloudPath, `projects describe ${projectId}`);

        if (result && Array.isArray(result) && result.length > 0) {
          const projectDetails = result[0];

          projectCache.set(`project-${projectId}`, JSON.stringify(projectDetails));
          projectCache.set(`project-${projectId}-timestamp`, Date.now().toString());

          return {
            id: projectDetails.projectId,
            name: projectDetails.name || projectDetails.projectId,
            projectNumber: projectDetails.projectNumber || "",
            createTime: projectDetails.createTime || new Date().toISOString(),
          };
        }

        showFailureToast("Project not found", {
          message: `No details found for project: ${projectId}`,
        });
        return null;
      } catch (error) {
        console.error("Error executing gcloud command:", error);
        showFailureToast("Failed to fetch project details", {
          message: error instanceof Error ? error.message : "Unknown error occurred while fetching project details",
        });
        return null;
      }
    } catch (error) {
      console.error("Error in getProjectDetails:", error);
      showFailureToast("Failed to get project details", {
        message: error instanceof Error ? error.message : "Unknown error occurred",
      });
      return null;
    }
  }

  static async getRecentlyUsedProjectsWithDetails(gcloudPath: string): Promise<Project[]> {
    if (!gcloudPath) {
      showFailureToast("Invalid parameters", {
        message: "gcloud path is required",
      });
      return [];
    }

    try {
      const recentlyUsedIds = CacheManager.getRecentlyUsedProjects();

      if (!recentlyUsedIds.length) {
        return [];
      }

      const cachedProjects = CacheManager.getProjectsList();
      const projectsMap = new Map<string, Project>();

      if (cachedProjects) {
        cachedProjects.projects.forEach((project) => {
          projectsMap.set(project.id, project);
        });
      }

      const recentProjects: Project[] = [];

      for (const id of recentlyUsedIds) {
        if (projectsMap.has(id)) {
          const project = projectsMap.get(id);
          if (project) {
            recentProjects.push(project);
          }
        } else {
          try {
            const projectDetails = await CacheManager.getProjectDetails(id, gcloudPath);
            if (projectDetails) {
              recentProjects.push(projectDetails);
            }
          } catch (error) {
            console.error(`Error fetching details for project ${id}:`, error);
            showFailureToast(`Failed to fetch details for project ${id}`, {
              message: error instanceof Error ? error.message : "Unknown error occurred",
            });

            continue;
          }
        }
      }

      return recentProjects;
    } catch (error) {
      console.error("Error getting recently used projects:", error);
      showFailureToast("Failed to get recently used projects", {
        message: error instanceof Error ? error.message : "Unknown error occurred",
      });
      return [];
    }
  }

  static syncRecentlyUsedProjectsWithCacheLimit(): void {
    const cacheLimit = CacheManager.getCacheLimit();
    const recentlyUsedIds = CacheManager.getRecentlyUsedProjects();

    if (recentlyUsedIds.length > cacheLimit) {
      const trimmedList = recentlyUsedIds.slice(0, cacheLimit);
      CacheManager.saveRecentlyUsedProjects(trimmedList);
    }
  }

  static ensureRecentlyUsedProjects(): void {
    const cachedProject = CacheManager.getSelectedProject();
    if (cachedProject) {
      const recentlyUsed = CacheManager.getRecentlyUsedProjects();
      if (!recentlyUsed.includes(cachedProject.projectId)) {
        recentlyUsed.unshift(cachedProject.projectId);
        CacheManager.saveRecentlyUsedProjects(recentlyUsed);
      }
    }
  }
}
