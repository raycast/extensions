import { getPreferenceValues } from "@raycast/api";
import { IAMService, IAMPrincipal } from "../services/iam/IAMService";
import { CacheManager } from "../utils/CacheManager";
import { showFailureToast } from "@raycast/utils";
import { findPrincipal } from "../utils/iamUtils";

interface ListRolesArguments {
  principal: string; // This will likely be the ID, e.g., user@example.com or a service account email
}

interface ExtensionPreferences {
  gcloudPath: string;
}

/**
 * This function is invoked by Raycast AI when the 'g-cloud-listRoles' tool is called.
 * It lists IAM roles for a specifically provided principal in the active project.
 */
export default async function listRoles(props: { arguments: ListRolesArguments }): Promise<string> {
  const { principal: principalIdentifier } = props.arguments;

  const preferences = getPreferenceValues<ExtensionPreferences>();
  const gcloudPath = preferences.gcloudPath || "gcloud"; // Use configured gcloud path

  const selectedProject = CacheManager.getSelectedProject();
  const projectId = selectedProject?.projectId || CacheManager.getRecentlyUsedProjects()[0];

  if (!projectId) {
    return "Error: Could not determine the current project ID. Please open the main g-cloud extension first.";
  }

  console.log(`listRoles tool called for principal identifier: '${principalIdentifier}' in project: ${projectId}`);

  try {
    const iamService = new IAMService(gcloudPath, projectId);

    // Use the new utility function
    const findPrincipalResult = await findPrincipal(principalIdentifier, iamService);

    if (typeof findPrincipalResult === "string") {
      // Ambiguity message from findPrincipal
      return findPrincipalResult;
    }

    if (!findPrincipalResult) {
      // No principal found
      return `No principal found matching identifier '${principalIdentifier}' in project ${projectId}.`;
    }

    const finalPrincipalToDisplay: IAMPrincipal = findPrincipalResult;

    // Format response for the found principal
    if (finalPrincipalToDisplay.roles.length === 0) {
      return `Principal '${finalPrincipalToDisplay.type}:${finalPrincipalToDisplay.id}' has no roles assigned in project ${projectId}.`;
    }

    let response = `Roles for principal '${finalPrincipalToDisplay.type}:${finalPrincipalToDisplay.id}' in project ${projectId}:\n\n`;
    finalPrincipalToDisplay.roles.forEach((role) => {
      response += `- ${role.role} (${role.title})\n`;
      if (role.description) {
        response += `  Description: ${role.description}\n`;
      }
      if (role.condition) {
        response += `  Condition: ${role.condition.title} (${role.condition.expression})\n`;
      }
      response += "\n";
    });
    return response;
  } catch (error: Error | unknown) {
    console.error(`Error in listRoles tool for project ${projectId}, principal ${principalIdentifier}:`, error);
    showFailureToast(error, { title: `Failed to list roles for ${principalIdentifier}` });
    return `Error fetching roles for principal '${principalIdentifier}' in project ${projectId}: ${error instanceof Error ? error.message : "Unknown error"}.`;
  }
}
