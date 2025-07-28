import { getPreferenceValues, showToast, Toast } from "@raycast/api";

interface Preferences {
  gitlabToken: string;
  gitlabUrl: string;
  projectIds: string;
}

export interface ProjectIdsResult {
  success: boolean;
  projectIds: number[] | null;
  error?: string;
}

export function getProjectIds(): ProjectIdsResult {
  try {
    const preferences = getPreferenceValues<Preferences>();

    if (!preferences.projectIds || preferences.projectIds.trim() === "") {
      return {
        success: false,
        projectIds: null,
        error: "Project IDs are required. Please configure them in extension preferences.",
      };
    }

    const trimmedInput = preferences.projectIds.trim();
    const ids = trimmedInput.split(",").map((id) => {
      const trimmedId = id.trim();
      const parsed = parseInt(trimmedId, 10);

      if (isNaN(parsed) || parsed <= 0) {
        throw new Error(`Invalid project ID: "${trimmedId}". Project IDs must be positive integers.`);
      }

      return parsed;
    });

    if (ids.length === 0) {
      return {
        success: false,
        projectIds: null,
        error: "No valid project IDs found. Please provide comma-separated positive integers.",
      };
    }

    return {
      success: true,
      projectIds: ids,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error parsing project IDs";
    console.error("Error parsing project IDs from preferences:", error);

    return {
      success: false,
      projectIds: null,
      error: errorMessage,
    };
  }
}

export async function showProjectIdsError(error: string): Promise<void> {
  await showToast({
    style: Toast.Style.Failure,
    title: "Project IDs Configuration Error",
    message: error,
  });
}
