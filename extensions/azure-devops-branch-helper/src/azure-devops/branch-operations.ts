/**
 * Branch-related Azure DevOps operations
 */

import { getPreferenceValues, showToast, Toast } from "@raycast/api";
import { runAz } from "../az-cli";
import type { Preferences } from "./types";

/**
 * Converts work item ID and title to a standardized branch name
 */
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

/**
 * Find existing remote branches that appear to belong to this work item, regardless of developer prefix
 */
export async function findExistingBranchesForWorkItem(
  workItemId: string,
  title: string,
): Promise<string[]> {
  try {
    const preferences = getPreferenceValues<Preferences>();
    if (!preferences.azureOrganization || !preferences.azureProject) {
      return [];
    }

    const repositoryName =
      preferences.azureRepository || preferences.azureProject;

    // Build the common slug used at the end of our branch names
    const slug = convertToBranchName(workItemId, title, ""); // no prefix

    // List all heads and filter by suffix match to the slug or id
    const { stdout } = await runAz([
      "repos",
      "ref",
      "list",
      "--filter",
      "heads/",
      "--output",
      "json",
      "--repository",
      repositoryName,
      "--organization",
      preferences.azureOrganization,
      "--project",
      preferences.azureProject,
    ]);

    const refs = JSON.parse(stdout) as Array<{ name?: string }>;
    const lowerSuffix = `/${slug}`.toLowerCase();
    const idNeedle = `/${workItemId}-`;

    const branches = refs
      .map((r) => r.name || "")
      .filter(Boolean)
      .filter((name) => name.toLowerCase().startsWith("refs/heads/"))
      .filter((name) => {
        const lower = name.toLowerCase();
        return lower.endsWith(lowerSuffix) || lower.includes(idNeedle);
      })
      .map((name) => name.replace(/^refs\/heads\//i, ""));

    // Deduplicate
    return Array.from(new Set(branches));
  } catch (error) {
    console.error("Failed to find existing branches for work item:", error);
    return [];
  }
}

/**
 * Creates a new branch in Azure DevOps
 */
export async function createBranch(branchName: string): Promise<boolean> {
  try {
    const preferences = getPreferenceValues<Preferences>();

    if (!preferences.azureOrganization || !preferences.azureProject) {
      throw new Error("Azure DevOps organization and project are required");
    }

    // Use repository from preferences or fall back to project name
    const repositoryName =
      preferences.azureRepository || preferences.azureProject;
    const sourceBranch = preferences.sourceBranch || "main";

    // Step 1: Get the object ID of the source branch
    const { stdout: objectId } = await runAz([
      "repos",
      "ref",
      "list",
      "--filter",
      `heads/${sourceBranch}`,
      "--query",
      "[0].objectId",
      "-o",
      "tsv",
      "--repository",
      repositoryName,
      "--organization",
      preferences.azureOrganization,
      "--project",
      preferences.azureProject,
    ]);
    const trimmedObjectId = objectId.trim();

    if (!trimmedObjectId) {
      throw new Error(`Source branch '${sourceBranch}' not found`);
    }

    // Step 2: Check if branch already exists
    try {
      const { stdout: existingBranch } = await runAz([
        "repos",
        "ref",
        "list",
        "--filter",
        `heads/${branchName}`,
        "--query",
        "[0].name",
        "-o",
        "tsv",
        "--repository",
        repositoryName,
        "--organization",
        preferences.azureOrganization,
        "--project",
        preferences.azureProject,
      ]);
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
    await runAz([
      "repos",
      "ref",
      "create",
      "--name",
      `refs/heads/${branchName}`,
      "--object-id",
      trimmedObjectId,
      "--repository",
      repositoryName,
      "--organization",
      preferences.azureOrganization,
      "--project",
      preferences.azureProject,
    ]);
    return true;
  } catch (error) {
    console.error("Failed to create branch:", error);
    return false;
  }
}
