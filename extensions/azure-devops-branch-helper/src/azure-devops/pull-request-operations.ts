/**
 * Pull request related Azure DevOps operations
 */

import { getPreferenceValues, showToast, Toast } from "@raycast/api";
import { runAz } from "../az-cli";
import { fetchWorkItemDetails } from "./work-item-operations";
import type { Preferences, PullRequestResult } from "./types";

/**
 * Creates a pull request from a work item and branch
 */
export async function createPullRequestFromWorkItem(
  workItemId: string,
  branchName: string,
): Promise<PullRequestResult | null> {
  try {
    const preferences = getPreferenceValues<Preferences>();

    if (!preferences.azureOrganization || !preferences.azureProject) {
      throw new Error("Azure DevOps organization and project are required");
    }

    // Fetch work item details
    const workItemDetails = await fetchWorkItemDetails(workItemId);
    if (!workItemDetails) {
      throw new Error("Could not fetch work item details");
    }

    const repositoryName =
      preferences.azureRepository || preferences.azureProject;
    const targetBranch = preferences.sourceBranch || "main";

    // Check if source branch is different from target branch
    if (branchName === targetBranch) {
      throw new Error(
        `Source branch (${branchName}) cannot be the same as target branch (${targetBranch})`,
      );
    }

    const prTitle = `${workItemId}: ${workItemDetails.title}`;
    const prDescription = `Work item #${workItemId} - ${workItemDetails.type}

**Work Item Details:**
- Title: ${workItemDetails.title}
- Type: ${workItemDetails.type}
- State: ${workItemDetails.state}

This PR was created from the work item activation workflow.`;

    // Create pull request
    const { stdout: prResult } = await runAz([
      "repos",
      "pr",
      "create",
      "--source-branch",
      branchName,
      "--target-branch",
      targetBranch,
      "--title",
      prTitle,
      "--description",
      prDescription,
      "--output",
      "json",
      "--organization",
      preferences.azureOrganization,
      "--project",
      preferences.azureProject,
      "--repository",
      repositoryName,
    ]);
    const prData = JSON.parse(prResult);

    // Link work item to PR
    try {
      await runAz([
        "repos",
        "pr",
        "work-item",
        "add",
        "--id",
        String(prData.pullRequestId),
        "--work-items",
        workItemId,
        "--output",
        "json",
        "--organization",
        preferences.azureOrganization,
      ]);
    } catch (linkError) {
      console.error("Failed to link work item to PR:", linkError);
      await showToast(
        Toast.Style.Failure,
        "Warning",
        "PR created but failed to link work item",
      );
    }

    // Generate PR URL
    const prUrl = `${preferences.azureOrganization}/${encodeURIComponent(preferences.azureProject)}/_git/${encodeURIComponent(repositoryName)}/pullrequest/${prData.pullRequestId}`;

    return {
      pullRequestId: prData.pullRequestId,
      title: prTitle,
      project: preferences.azureProject || "Unknown",
      url: prUrl,
    };
  } catch (error) {
    console.error("Failed to create pull request:", error);
    return null;
  }
}
