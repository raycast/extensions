import { IAMService } from "./services/iam/IAMService";
import { IAMAIService } from "./services/iam/IAMAIService";
import { CacheManager } from "./utils/CacheManager";
import { getPreferenceValues } from "@raycast/api";

interface ExtensionPreferences {
  gcloudPath: string;
}

/**
 * Lists all IAM principals and their assigned roles within the current Google Cloud project.
 * This tool is called by Raycast AI when the user asks for a general list of principals in their project.
 */
export async function listAllProjectPrincipalsTool(): Promise<string> {
  const preferences = getPreferenceValues<ExtensionPreferences>();
  const GCLOUD_PATH = preferences.gcloudPath || "gcloud";

  // Attempt to get the current/last used project ID
  const selectedProject = CacheManager.getSelectedProject();
  let projectId: string | null = null;

  if (selectedProject && selectedProject.projectId) {
    projectId = selectedProject.projectId;
  } else {
    const recentlyUsed = CacheManager.getRecentlyUsedProjects();
    if (recentlyUsed.length > 0) {
      projectId = recentlyUsed[0]; // Default to the most recently used project
    }
  }

  if (!projectId) {
    return "Error: Could not determine the current project ID. Please open the main g-cloud extension first to select or set a project.";
  }

  try {
    // It's important that IAMService and IAMAIService can be instantiated here.
    // Ensure paths are correct and these services don't have UI-specific dependencies if called from a background AI tool.
    const iamService = new IAMService(GCLOUD_PATH, projectId);
    const iamAIService = new IAMAIService(iamService, projectId);

    // Use the handleQuery method from IAMAIService, which now has specific logic
    // for "principal" or "whom" queries to list all principals.
    return await iamAIService.handleQuery("whom are my principals in this project");
  } catch (error: Error | unknown) {
    console.error(`Error in listAllProjectPrincipalsTool for project ${projectId}:`, error);
    return `Error fetching principals for project ${projectId}: ${error instanceof Error ? error.message : "Unknown error"}. Please ensure the g-cloud CLI is configured correctly and you have permissions.`;
  }
}
