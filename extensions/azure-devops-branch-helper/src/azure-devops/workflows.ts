/**
 * High-level workflows that combine multiple operations
 */

import { getPreferenceValues, showToast, Toast } from "@raycast/api";
import { fetchWorkItemDetails, activateWorkItem } from "./work-item-operations";
import { convertToBranchName, createBranch } from "./branch-operations";
import { createPullRequestFromWorkItem } from "./pull-request-operations";
import type { Preferences, ActivateAndCreatePRResult } from "./types";

/**
 * Complete workflow to activate a work item and create a PR
 * This combines: activate work item -> create branch -> create PR
 */
export async function activateAndCreatePR(
  workItemId: string,
): Promise<ActivateAndCreatePRResult> {
  const preferences = getPreferenceValues<Preferences>();

  // Step 1: Fetch work item details
  const workItemDetails = await fetchWorkItemDetails(workItemId);
  if (!workItemDetails) {
    await showToast(
      Toast.Style.Failure,
      "Error",
      "Could not fetch work item details",
    );
    return { success: false };
  }

  // Step 2: Activate work item
  const activated = await activateWorkItem(workItemId);
  if (!activated) {
    await showToast(
      Toast.Style.Failure,
      "Error",
      "Failed to activate work item",
    );
    return { success: false };
  }

  // Step 3: Generate branch name
  const branchName = convertToBranchName(
    workItemId,
    workItemDetails.title,
    preferences.branchPrefix || "",
  );

  // Step 4: Create branch
  const branchCreated = await createBranch(branchName);
  if (!branchCreated) {
    await showToast(Toast.Style.Failure, "Error", "Failed to create branch");
    return { success: false };
  }

  // Step 5: Create pull request
  const prResult = await createPullRequestFromWorkItem(workItemId, branchName);
  if (!prResult) {
    await showToast(
      Toast.Style.Failure,
      "Error",
      "Failed to create pull request",
    );
    return { success: false, branchName };
  }

  await showToast(
    Toast.Style.Success,
    "Success!",
    `Activated work item, created branch and PR #${prResult.pullRequestId}`,
  );

  return { success: true, prResult, branchName };
}
