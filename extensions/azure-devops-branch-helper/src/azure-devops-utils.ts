import { exec } from "child_process";
import { promisify } from "util";
import { getPreferenceValues, showToast, Toast } from "@raycast/api";

const execAsync = promisify(exec);

interface Preferences {
  branchPrefix: string;
  azureOrganization?: string;
  azureProject?: string;
  azureRepository?: string;
  sourceBranch: string;
}

interface WorkItemDetails {
  id: string;
  title: string;
  type: string;
  assignedTo?: string;
  state: string;
}

interface PullRequestResult {
  pullRequestId: number;
  title: string;
  project: string;
  url?: string;
}

export async function getCurrentUser(): Promise<string | null> {
  try {
    const azCommand = "/opt/homebrew/bin/az";
    const { stdout: userEmail } = await execAsync(
      `${azCommand} account show --query user.name -o tsv`,
    );
    return userEmail.trim();
  } catch (error) {
    console.error("Failed to get current user:", error);
    return null;
  }
}

export async function fetchWorkItemDetails(
  workItemId: string,
): Promise<WorkItemDetails | null> {
  try {
    const preferences = getPreferenceValues<Preferences>();
    const azCommand = "/opt/homebrew/bin/az";

    let fetchCommand = `${azCommand} boards work-item show --id ${workItemId} --output json`;

    if (preferences.azureOrganization) {
      fetchCommand += ` --organization "${preferences.azureOrganization}"`;
    }

    const { stdout } = await execAsync(fetchCommand);
    const workItem = JSON.parse(stdout);

    return {
      id: workItemId,
      title: workItem.fields?.["System.Title"] || "Unknown Title",
      type: workItem.fields?.["System.WorkItemType"] || "Unknown Type",
      assignedTo:
        workItem.fields?.["System.AssignedTo"]?.uniqueName || undefined,
      state: workItem.fields?.["System.State"] || "Unknown",
    };
  } catch (error) {
    console.error("Failed to fetch work item details:", error);
    return null;
  }
}

export async function activateWorkItem(workItemId: string): Promise<boolean> {
  try {
    const preferences = getPreferenceValues<Preferences>();
    const azCommand = "/opt/homebrew/bin/az";
    const currentUser = await getCurrentUser();

    if (!preferences.azureOrganization) {
      throw new Error("Azure DevOps organization is required");
    }

    if (!currentUser) {
      throw new Error("Could not determine current user");
    }

    // Activate work item and assign to current user
    const updateCommand = `${azCommand} boards work-item update --id ${workItemId} --state "Active" --assigned-to "${currentUser}" --output json --organization "${preferences.azureOrganization}"`;

    await execAsync(updateCommand);
    return true;
  } catch (error) {
    console.error("Failed to activate work item:", error);
    return false;
  }
}

export function convertToBranchName(
  workItemId: string,
  title: string,
  prefix: string,
): string {
  const combined = `${workItemId} ${title}`;
  const slug = combined
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return `${prefix}${slug}`;
}

export async function createBranch(branchName: string): Promise<boolean> {
  try {
    const preferences = getPreferenceValues<Preferences>();
    const azCommand = "/opt/homebrew/bin/az";

    if (!preferences.azureOrganization || !preferences.azureProject) {
      throw new Error("Azure DevOps organization and project are required");
    }

    // Use repository from preferences or fall back to project name
    const repositoryName =
      preferences.azureRepository || preferences.azureProject;
    const sourceBranch = preferences.sourceBranch || "main";

    // Step 1: Get the object ID of the source branch
    const getObjectIdCommand = `${azCommand} repos ref list --filter "heads/${sourceBranch}" --query "[0].objectId" -o tsv --repository "${repositoryName}" --organization "${preferences.azureOrganization}" --project "${preferences.azureProject}"`;

    const { stdout: objectId } = await execAsync(getObjectIdCommand);
    const trimmedObjectId = objectId.trim();

    if (!trimmedObjectId) {
      throw new Error(`Source branch '${sourceBranch}' not found`);
    }

    // Step 2: Check if branch already exists
    const checkBranchCommand = `${azCommand} repos ref list --filter "heads/${branchName}" --query "[0].name" -o tsv --repository "${repositoryName}" --organization "${preferences.azureOrganization}" --project "${preferences.azureProject}"`;

    try {
      const { stdout: existingBranch } = await execAsync(checkBranchCommand);
      if (existingBranch.trim()) {
        await showToast(
          Toast.Style.Failure,
          "Branch exists",
          `Branch '${branchName}' already exists`,
        );
        return false;
      }
    } catch {
      // If the check command fails, it might be because the branch doesn't exist, which is what we want
      console.log("Branch check failed, assuming branch doesn't exist");
    }

    // Step 3: Create the branch using object ID
    const createBranchCommand = `${azCommand} repos ref create --name "refs/heads/${branchName}" --object-id "${trimmedObjectId}" --repository "${repositoryName}" --organization "${preferences.azureOrganization}" --project "${preferences.azureProject}"`;

    await execAsync(createBranchCommand);
    return true;
  } catch (error) {
    console.error("Failed to create branch:", error);
    return false;
  }
}

export async function createPullRequestFromWorkItem(
  workItemId: string,
  branchName: string,
): Promise<PullRequestResult | null> {
  try {
    const preferences = getPreferenceValues<Preferences>();
    const azCommand = "/opt/homebrew/bin/az";

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
    const createPRCommand = `${azCommand} repos pr create \
      --source-branch "${branchName}" \
      --target-branch "${targetBranch}" \
      --title "${prTitle}" \
      --description "${prDescription}" \
      --output json \
      --organization "${preferences.azureOrganization}" \
      --project "${preferences.azureProject}" \
      --repository "${repositoryName}"`;

    const { stdout: prResult } = await execAsync(createPRCommand);
    const prData = JSON.parse(prResult);

    // Link work item to PR
    try {
      const linkWorkItemCommand = `${azCommand} repos pr work-item add --id ${prData.pullRequestId} --work-items ${workItemId} --output json --organization "${preferences.azureOrganization}"`;
      await execAsync(linkWorkItemCommand);
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

export async function activateAndCreatePR(workItemId: string): Promise<{
  success: boolean;
  prResult?: PullRequestResult;
  branchName?: string;
}> {
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
