import { Tool, getPreferenceValues } from "@raycast/api";
import { IAMService, IAMPrincipal } from "../services/iam/IAMService";
import { CacheManager } from "../utils/CacheManager";
import { findPrincipal } from "../utils/iamUtils";
import { showFailureToast } from "@raycast/utils";

interface CommandArguments {
  principal: string;
  role: string;
}

interface ExtensionPreferences {
  gcloudPath: string;
}

// Confirmation function
export const confirmation: Tool.Confirmation<CommandArguments> = async (input) => {
  return {
    message: `Are you sure you want to remove role '${input.role}' from principal '${input.principal}'?`,
    destructive: true,
  };
};

export default async function Command(props: { arguments: CommandArguments }) {
  const { principal: principalIdentifier, role } = props.arguments;

  const preferences = getPreferenceValues<ExtensionPreferences>();
  const gcloudPath = preferences.gcloudPath || "gcloud";

  const selectedProject = CacheManager.getSelectedProject();
  const projectId = selectedProject?.projectId || CacheManager.getRecentlyUsedProjects()[0];

  if (!projectId) {
    const msg = "Error: Could not determine the current project ID. Please open the main g-cloud extension first.";
    showFailureToast(msg, { title: "Project ID Missing" });
    return msg;
  }

  const iamService = new IAMService(gcloudPath, projectId);

  try {
    const findPrincipalResult = await findPrincipal(principalIdentifier, iamService);

    if (typeof findPrincipalResult === "string") {
      showFailureToast(findPrincipalResult, { title: "Principal Ambiguous" });
      return findPrincipalResult;
    }

    if (!findPrincipalResult) {
      const msg = `No principal found matching identifier '${principalIdentifier}' in project ${projectId}.`;
      showFailureToast(msg, { title: "Principal Not Found" });
      return msg;
    }

    const principalToModify: IAMPrincipal = findPrincipalResult;

    await iamService.removeMember(role, principalToModify.type, principalToModify.id);

    return `Removed role '${role}' from ${principalToModify.type}:${principalToModify.id}`;
  } catch (error: Error | unknown) {
    console.error(
      `Error in removeRole tool for project ${projectId}, principal ${principalIdentifier}, role ${role}:`,
      error,
    );
    showFailureToast(error, { title: `Failed to remove role for ${principalIdentifier}` });
    return `Error removing role '${role}' from principal '${principalIdentifier}': ${error instanceof Error ? error.message : "Unknown error"}.`;
  }
}
