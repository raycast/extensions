import { Cache } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import fs from "fs";
import { homedir } from "os";
import { join } from "path";

// Cache keys
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

// Cache expiration times (in milliseconds)
export const CACHE_TTL = {
  AUTH: 72 * 60 * 60 * 1000, // 72 hours (increased from 24 hours)
  PROJECT: 72 * 60 * 60 * 1000, // Same as AUTH - 72 hours
  PROJECTS_LIST: 6 * 60 * 60 * 1000, // 6 hours (increased from 1 hour)
};

// File paths
const PREFS_FILE_PATH = join(homedir(), ".raycast-gcloud-prefs.json");

// Create cache instance
const cache = new Cache({ namespace: "gcloud-cache" });
// Create a settings cache instance
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

/**
 * Cache manager for Google Cloud authentication and project selection
 */
export class CacheManager {
  /**
   * Save authentication status to cache
   */
  static saveAuthStatus(isAuthenticated: boolean, user: string): void {
    cache.set(CACHE_KEYS.AUTH_STATUS, isAuthenticated.toString());
    cache.set(CACHE_KEYS.AUTH_USER, user);
    cache.set(CACHE_KEYS.AUTH_TIMESTAMP, Date.now().toString());
  }

  /**
   * Get cached authentication status
   */
  static getAuthStatus(): CachedAuth | null {
    const isAuthenticatedStr = cache.get(CACHE_KEYS.AUTH_STATUS);
    const user = cache.get(CACHE_KEYS.AUTH_USER);
    const timestampStr = cache.get(CACHE_KEYS.AUTH_TIMESTAMP);

    if (!isAuthenticatedStr || !timestampStr) {
      return null;
    }

    const isAuthenticated = isAuthenticatedStr === "true";
    const timestamp = parseInt(timestampStr, 10);

    // Check if cache is expired
    if (Date.now() - timestamp > CACHE_TTL.AUTH) {
      return null;
    }

    return { isAuthenticated, user: user || "", timestamp };
  }

  /**
   * Update authentication cache duration
   */
  static updateAuthCacheDuration(hours: number): void {
    // Update the setting in cache
    settingsCache.set("auth-cache-duration", hours.toString());
  }

  /**
   * Clear authentication cache
   */
  static clearAuthCache(): void {
    cache.remove(CACHE_KEYS.AUTH_STATUS);
    cache.remove(CACHE_KEYS.AUTH_USER);
    cache.remove(CACHE_KEYS.AUTH_TIMESTAMP);
  }

  /**
   * Get the cache limit setting
   */
  static getCacheLimit(): number {
    const cachedLimit = settingsCache.get("cache-limit");
    return cachedLimit ? parseInt(cachedLimit, 10) : 1; // Default to 1 if not set
  }

  /**
   * Save selected project to cache and preferences file
   */
  static saveSelectedProject(projectId: string): void {
    if (!projectId || typeof projectId !== "string") {
      console.error("Invalid project ID provided to saveSelectedProject:", projectId);
      return;
    }

    // Get current timestamp for unified use
    const now = Date.now();

    // Save to cache
    cache.set(CACHE_KEYS.SELECTED_PROJECT, projectId);
    cache.set(CACHE_KEYS.PROJECT_TIMESTAMP, now.toString());

    // Update recently used projects list based on cache limit
    const cacheLimit = CacheManager.getCacheLimit();
    const recentlyUsedStr = cache.get(CACHE_KEYS.RECENTLY_USED_PROJECTS);
    let recentlyUsed: string[] = recentlyUsedStr ? JSON.parse(recentlyUsedStr) : [];

    // Remove the current project if it's already in the list
    recentlyUsed = recentlyUsed.filter((id) => id !== projectId);

    // Add the current project to the beginning of the list
    recentlyUsed.unshift(projectId);

    // Trim the list to match the cache limit
    if (recentlyUsed.length > cacheLimit) {
      recentlyUsed = recentlyUsed.slice(0, cacheLimit);
    }

    // Ensure no duplicates (should never happen with the code above, but just to be extra safe)
    recentlyUsed = [...new Set(recentlyUsed)];

    // Save the updated list
    cache.set(CACHE_KEYS.RECENTLY_USED_PROJECTS, JSON.stringify(recentlyUsed));

    // Save to preferences file to ensure persistence
    try {
      // We save both the projectId and the recentlyUsed list to preferences
      // to ensure they persist even if the cache is cleared
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

  /**
   * Get cached selected project
   */
  static getSelectedProject(): CachedProject | null {
    // Try to get from cache first
    const projectId = cache.get(CACHE_KEYS.SELECTED_PROJECT);
    const timestampStr = cache.get(CACHE_KEYS.PROJECT_TIMESTAMP);

    if (projectId && timestampStr) {
      const timestamp = parseInt(timestampStr, 10);

      // Check if cache is expired
      if (Date.now() - timestamp <= CACHE_TTL.PROJECT) {
        return { projectId, timestamp };
      }
    }

    // If not in cache or expired, try to get from preferences file
    try {
      if (fs.existsSync(PREFS_FILE_PATH)) {
        const prefsData = JSON.parse(fs.readFileSync(PREFS_FILE_PATH, "utf8"));
        if (prefsData.projectId && prefsData.timestamp) {
          // Check if preferences data is expired
          if (Date.now() - prefsData.timestamp <= CACHE_TTL.PROJECT) {
            // Update cache with data from preferences file
            cache.set(CACHE_KEYS.SELECTED_PROJECT, prefsData.projectId);
            cache.set(CACHE_KEYS.PROJECT_TIMESTAMP, prefsData.timestamp.toString());

            // Also restore recently used projects if available
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

  /**
   * Get recently used projects
   */
  static getRecentlyUsedProjects(): string[] {
    // Try to get from cache first
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

    // If not in cache, try to get from preferences file
    try {
      if (fs.existsSync(PREFS_FILE_PATH)) {
        const prefsData = JSON.parse(fs.readFileSync(PREFS_FILE_PATH, "utf8"));
        if (prefsData.recentlyUsed && Array.isArray(prefsData.recentlyUsed)) {
          // Update cache with data from preferences file
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

  /**
   * Clear project selection cache
   */
  static clearProjectCache(): void {
    cache.remove(CACHE_KEYS.SELECTED_PROJECT);
    cache.remove(CACHE_KEYS.PROJECT_TIMESTAMP);
    cache.remove(CACHE_KEYS.RECENTLY_USED_PROJECTS);
  }

  /**
   * Save projects list to cache
   */
  static saveProjectsList(projects: Project[]): void {
    if (!Array.isArray(projects)) {
      console.error("Invalid projects array provided to saveProjectsList:", projects);
      return;
    }

    // Ensure all projects have the required properties
    const validProjects = projects.filter((project) => project && project.id);

    // Always save the full list of projects to the cache for "Browse All Projects" functionality
    cache.set(CACHE_KEYS.PROJECTS_LIST, JSON.stringify(validProjects));
    cache.set(CACHE_KEYS.PROJECTS_LIST_TIMESTAMP, Date.now().toString());

    // No need to filter projects here since we always want the full list available
    // The filtering is done in the UI components when displaying the list based on recently used projects
  }

  /**
   * Get cached projects list
   */
  static getProjectsList(): CachedProjectsList | null {
    const projectsListStr = cache.get(CACHE_KEYS.PROJECTS_LIST);
    const timestampStr = cache.get(CACHE_KEYS.PROJECTS_LIST_TIMESTAMP);

    if (!projectsListStr || !timestampStr) {
      return null;
    }

    const timestamp = parseInt(timestampStr, 10);

    // Check if cache is expired
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

  /**
   * Clear projects list cache
   */
  static clearProjectsListCache(): void {
    cache.remove(CACHE_KEYS.PROJECTS_LIST);
    cache.remove(CACHE_KEYS.PROJECTS_LIST_TIMESTAMP);
  }

  /**
   * Clear all caches
   */
  static clearAllCaches(): void {
    CacheManager.clearAuthCache();
    CacheManager.clearProjectCache();
    CacheManager.clearProjectsListCache();
  }

  /**
   * Save recently used projects
   */
  static saveRecentlyUsedProjects(projectIds: string[]): void {
    cache.set(CACHE_KEYS.RECENTLY_USED_PROJECTS, JSON.stringify(projectIds));
  }

  /**
   * Get detailed project information for a given project ID
   */
  static async getProjectDetails(projectId: string, gcloudPath: string): Promise<Project | null> {
    if (!projectId || typeof projectId !== "string" || !gcloudPath) {
      console.error("Invalid parameters in getProjectDetails:", { projectId, gcloudPath });
      showFailureToast("Invalid parameters", {
        message: "Project ID and gcloud path are required",
      });
      return null;
    }

    try {
      // Check local cache first (ProjectView has its own cache)
      const projectCache = new Cache({ namespace: "project-details" });
      const cachedDetailsStr = projectCache.get(`project-${projectId}`);
      const timestampStr = projectCache.get(`project-${projectId}-timestamp`);

      if (cachedDetailsStr && timestampStr) {
        const timestamp = parseInt(timestampStr, 10);

        // Check if cache is not expired
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

      // If not in cache or expired, fetch from API
      try {
        // Import the executeGcloudCommand function dynamically to avoid circular dependency
        const { executeGcloudCommand } = await import("../gcloud");
        const result = await executeGcloudCommand(gcloudPath, `projects describe ${projectId}`);

        if (result && Array.isArray(result) && result.length > 0) {
          const projectDetails = result[0];

          // Cache the result
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

  /**
   * Get all projects with detailed information for the recently used project IDs
   */
  static async getRecentlyUsedProjectsWithDetails(gcloudPath: string): Promise<Project[]> {
    if (!gcloudPath) {
      showFailureToast("Invalid parameters", {
        message: "gcloud path is required",
      });
      return [];
    }

    try {
      // Get the recently used project IDs
      const recentlyUsedIds = CacheManager.getRecentlyUsedProjects();

      if (!recentlyUsedIds.length) {
        return [];
      }

      // Get all projects from cache
      const cachedProjects = CacheManager.getProjectsList();
      const projectsMap = new Map<string, Project>();

      if (cachedProjects) {
        // Create a map for quick lookup
        cachedProjects.projects.forEach((project) => {
          projectsMap.set(project.id, project);
        });
      }

      // Collect all recently used projects
      const recentProjects: Project[] = [];

      // Try to get each recently used project from the map or fetch it directly
      for (const id of recentlyUsedIds) {
        if (projectsMap.has(id)) {
          // Use the cached project
          const project = projectsMap.get(id);
          if (project) {
            recentProjects.push(project);
          }
        } else {
          try {
            // Fetch project details directly
            const projectDetails = await CacheManager.getProjectDetails(id, gcloudPath);
            if (projectDetails) {
              recentProjects.push(projectDetails);
            }
          } catch (error) {
            console.error(`Error fetching details for project ${id}:`, error);
            showFailureToast(`Failed to fetch details for project ${id}`, {
              message: error instanceof Error ? error.message : "Unknown error occurred",
            });
            // Continue with other projects even if one fails
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

  /**
   * Ensure recently used projects respect the cache limit
   * This function ensures that the recently used projects list
   * never exceeds the configured cache limit
   */
  static syncRecentlyUsedProjectsWithCacheLimit(): void {
    const cacheLimit = CacheManager.getCacheLimit();
    const recentlyUsedIds = CacheManager.getRecentlyUsedProjects();

    // If the list exceeds the limit, trim it
    if (recentlyUsedIds.length > cacheLimit) {
      const trimmedList = recentlyUsedIds.slice(0, cacheLimit);
      CacheManager.saveRecentlyUsedProjects(trimmedList);
    }
  }
}
