import { getPreferenceValues, showToast, Toast } from "@raycast/api";
import { runAz } from "./az-cli";
import { promises as fs } from "fs";
import os from "os";
import path from "path";

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

export interface WorkItemLite {
  id: number;
  title: string;
  description?: string;
  type?: string;
  teamProject?: string;
  state?: string;
}

interface RelationItem {
  rel: string;
  url: string;
}

interface PullRequestResult {
  pullRequestId: number;
  title: string;
  project: string;
  url?: string;
}

export async function getCurrentUser(): Promise<string | null> {
  try {
    const { stdout: userEmail } = await runAz([
      "account",
      "show",
      "--query",
      "user.name",
      "-o",
      "tsv",
    ]);
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
    const args = [
      "boards",
      "work-item",
      "show",
      "--id",
      workItemId,
      "--output",
      "json",
      ...(preferences.azureOrganization
        ? ["--organization", preferences.azureOrganization]
        : []),
    ];
    const { stdout } = await runAz(args);
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
    const currentUser = await getCurrentUser();

    if (!preferences.azureOrganization) {
      throw new Error("Azure DevOps organization is required");
    }

    if (!currentUser) {
      throw new Error("Could not determine current user");
    }

    // Activate work item and assign to current user
    await runAz([
      "boards",
      "work-item",
      "update",
      "--id",
      workItemId,
      "--state",
      "Active",
      "--assigned-to",
      currentUser,
      "--output",
      "json",
      "--organization",
      preferences.azureOrganization!,
    ]);
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

// Find existing remote branches that appear to belong to this work item, regardless of developer prefix
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

// ========== Work Item Related Functions ==========

export async function getWorkItemLite(
  id: number,
): Promise<WorkItemLite | null> {
  try {
    const preferences = getPreferenceValues<Preferences>();
    const { stdout } = await runAz([
      "boards",
      "work-item",
      "show",
      "--id",
      String(id),
      "--output",
      "json",
      ...(preferences.azureOrganization
        ? ["--organization", preferences.azureOrganization]
        : []),
    ]);
    const json = JSON.parse(stdout);
    return {
      id,
      title: json.fields?.["System.Title"] || "Untitled",
      description: json.fields?.["System.Description"],
      type: json.fields?.["System.WorkItemType"],
      teamProject: json.fields?.["System.TeamProject"],
      state: json.fields?.["System.State"],
    };
  } catch (e) {
    console.error("Failed to fetch WorkItemLite", id, e);
    return null;
  }
}

export async function getRelatedWorkItems(workItemId: number): Promise<{
  parent: WorkItemLite | null;
  siblings: WorkItemLite[];
  related: WorkItemLite[];
  children: WorkItemLite[];
}> {
  const preferences = getPreferenceValues<Preferences>();

  const extractId = (url: string): number | null => {
    const m = url.match(/workItems\/(\d+)/i);
    return m ? Number(m[1]) : null;
  };

  let parent: WorkItemLite | null = null;
  let siblings: WorkItemLite[] = [];
  let relatedItems: WorkItemLite[] = [];
  let children: WorkItemLite[] = [];

  const { stdout: relStdout } = await runAz([
    "boards",
    "work-item",
    "show",
    "--id",
    String(workItemId),
    "--output",
    "json",
    "--expand",
    "relations",
    ...(preferences.azureOrganization
      ? ["--organization", preferences.azureOrganization]
      : []),
  ]);
  const withRels = JSON.parse(relStdout);
  const relations: RelationItem[] = withRels.relations || [];

  // Children of the current item (Hierarchy-Forward)
  const childIds = relations
    .filter((r) => r.rel?.toLowerCase().includes("hierarchy-forward"))
    .map((r) => extractId(r.url))
    .filter((id): id is number => !!id)
    .slice(0, 25);
  if (childIds.length) {
    const fetched = await Promise.all(
      childIds.map((id) => getWorkItemLite(id)),
    );
    children = fetched.filter((w): w is WorkItemLite => !!w);
  }

  const parentRel = relations.find((r) =>
    r.rel?.toLowerCase().includes("hierarchy-reverse"),
  );
  if (parentRel) {
    const parentId = extractId(parentRel.url);
    if (parentId) {
      parent = await getWorkItemLite(parentId);
      const { stdout: parentRelsStdout } = await runAz([
        "boards",
        "work-item",
        "show",
        "--id",
        String(parentId),
        "--output",
        "json",
        "--expand",
        "relations",
        ...(preferences.azureOrganization
          ? ["--organization", preferences.azureOrganization]
          : []),
      ]);
      const parentWithRels = JSON.parse(parentRelsStdout);
      const parentRels: RelationItem[] = parentWithRels.relations || [];
      const childIds = parentRels
        .filter((r) => r.rel?.toLowerCase().includes("hierarchy-forward"))
        .map((r) => extractId(r.url))
        .filter((id): id is number => !!id && id !== workItemId)
        .slice(0, 25);
      if (childIds.length) {
        const fetched = await Promise.all(
          childIds.map((id) => getWorkItemLite(id)),
        );
        siblings = fetched.filter((w): w is WorkItemLite => !!w);
      }
    }
  }

  const relatedIds = relations
    .filter((r) => r.rel?.toLowerCase().includes("system.linktypes.related"))
    .map((r) => extractId(r.url))
    .filter((id): id is number => !!id)
    .slice(0, 25);
  if (relatedIds.length) {
    const fetched = await Promise.all(
      relatedIds.map((id) => getWorkItemLite(id)),
    );
    relatedItems = fetched.filter((w): w is WorkItemLite => !!w);
  }

  return { parent, siblings, related: relatedItems, children };
}

export interface WorkItemComment {
  id: number;
  text: string;
  createdBy: {
    displayName: string;
    uniqueName: string;
  };
  createdDate: string;
  modifiedBy?: {
    displayName: string;
    uniqueName: string;
  };
  modifiedDate?: string;
}

export async function getWorkItemCommentsCount(
  workItemId: number,
): Promise<number | null> {
  try {
    const preferences = getPreferenceValues<Preferences>();
    // Work item comments API requires project in the route
    const project = preferences.azureProject || "WeDo"; // fallback to WeDo project
    const route = `${project}/_apis/wit/workItems/${workItemId}/comments?api-version=7.1-preview.3`;
    const { stdout } = await runAz([
      "devops",
      "invoke",
      "--route",
      route,
      "--output",
      "json",
      ...(preferences.azureOrganization
        ? ["--organization", preferences.azureOrganization]
        : []),
    ]);
    const json = JSON.parse(stdout);
    if (typeof json.totalCount === "number") return json.totalCount;
    if (typeof json.count === "number" && Array.isArray(json.value)) {
      // Fallback: if full list returned without totalCount, use length
      return Number(json.count) || json.value.length || 0;
    }
    if (Array.isArray(json.value)) return json.value.length;
    return 0;
  } catch (e) {
    console.error("Failed to get comments count for", workItemId, e);
    return null;
  }
}

export async function getWorkItemComments(
  workItemId: number,
): Promise<WorkItemComment[]> {
  try {
    const preferences = getPreferenceValues<Preferences>();

    // Work item comments API requires project in the route parameters
    const project = preferences.azureProject || "WeDo"; // fallback to WeDo project

    console.log(
      "[getWorkItemComments] Fetching comments for work item:",
      workItemId,
    );
    console.log("[getWorkItemComments] Using project:", project);

    const { stdout } = await runAz([
      "devops",
      "invoke",
      "--area",
      "wit",
      "--resource",
      "comments",
      "--route-parameters",
      `project=${project}`,
      `workItemId=${workItemId}`,
      "--api-version",
      "6.0-preview",
      "--output",
      "json",
      ...(preferences.azureOrganization
        ? ["--organization", preferences.azureOrganization]
        : []),
    ]);

    const json = JSON.parse(stdout);
    console.log(
      "[getWorkItemComments] Raw API response:",
      JSON.stringify(json, null, 2),
    );

    // The API returns comments in a "comments" array, not "value"
    if (Array.isArray(json.comments)) {
      console.log(
        "[getWorkItemComments] Found",
        json.comments.length,
        "comments",
      );
      const comments = json.comments.map(
        (comment: {
          id?: number;
          text?: string;
          createdBy?: { displayName?: string; uniqueName?: string };
          createdDate?: string;
          modifiedBy?: { displayName?: string; uniqueName?: string };
          modifiedDate?: string;
        }) => {
          console.log("[getWorkItemComments] Processing comment:", {
            id: comment.id,
            text: comment.text?.substring(0, 100) + "...",
            createdBy: comment.createdBy?.displayName,
            createdDate: comment.createdDate,
          });

          return {
            id: comment.id || 0,
            text: comment.text || "",
            createdBy: {
              displayName: comment.createdBy?.displayName || "Unknown",
              uniqueName: comment.createdBy?.uniqueName || "",
            },
            createdDate: comment.createdDate || "",
            modifiedBy: comment.modifiedBy
              ? {
                  displayName: comment.modifiedBy.displayName || "Unknown",
                  uniqueName: comment.modifiedBy.uniqueName || "",
                }
              : undefined,
            modifiedDate: comment.modifiedDate || undefined,
          };
        },
      );

      console.log(
        "[getWorkItemComments] Returning",
        comments.length,
        "processed comments",
      );
      return comments;
    }

    console.log("[getWorkItemComments] No comments array found in response");
    return [];
  } catch (e) {
    console.error(
      "[getWorkItemComments] Error fetching comments for",
      workItemId,
      e,
    );
    return [];
  }
}

export async function addCommentToWorkItem(
  workItemId: number,
  comment: string,
): Promise<{ success: boolean; error?: string }> {
  const preferences = getPreferenceValues<Preferences>();
  const body = JSON.stringify({ text: comment });

  // Write body to a temp file because some az versions require --in-file
  const tmpFile = path.join(
    os.tmpdir(),
    `raycast-ado-comment-${workItemId}-${Date.now()}.json`,
  );

  // Log the command we're about to run for debugging
  console.log(
    "[addCommentToWorkItem] Will execute command with workItemId:",
    workItemId,
  );
  console.log(
    "[addCommentToWorkItem] Organization:",
    preferences.azureOrganization,
  );
  console.log("[addCommentToWorkItem] Comment body:", body);

  // Work item comments API requires project in the route parameters
  const project = preferences.azureProject || "WeDo"; // fallback to WeDo project
  const args = [
    "devops",
    "invoke",
    "--area",
    "wit",
    "--resource",
    "comments",
    "--route-parameters",
    `project=${project}`,
    `workItemId=${workItemId}`,
    "--http-method",
    "POST",
    "--in-file",
    tmpFile,
    "--api-version",
    "6.0-preview",
    "--output",
    "json",
    ...(preferences.azureOrganization
      ? ["--organization", preferences.azureOrganization]
      : []),
  ];

  console.log("[addCommentToWorkItem] Using project:", project);

  try {
    await fs.writeFile(tmpFile, body, "utf8");

    const { stdout } = await runAz(args);
    const json = JSON.parse(stdout || "{}");
    if (json && (json.id || json.text)) {
      try {
        await fs.unlink(tmpFile);
      } catch (cleanupError) {
        console.error("Failed to cleanup temp file:", cleanupError);
      }
      return { success: true };
    }
    try {
      await fs.unlink(tmpFile);
    } catch (cleanupError) {
      console.error("Failed to cleanup temp file:", cleanupError);
    }
    return { success: true };
  } catch (e: unknown) {
    // Enhanced error logging for debugging
    console.error("[addCommentToWorkItem] Full error object:", e);
    console.error("[addCommentToWorkItem] workItemId:", workItemId);
    console.error("[addCommentToWorkItem] command args:", args);

    const msg =
      typeof e?.stderr === "string" && e.stderr
        ? e.stderr
        : e?.message || String(e);
    console.error("[addCommentToWorkItem] Final error message:", msg);

    // Clean up temp file on error
    try {
      await fs.unlink(tmpFile);
    } catch (cleanupError) {
      console.error(
        "[addCommentToWorkItem] Failed to cleanup temp file:",
        cleanupError,
      );
    }

    return { success: false, error: msg };
  }
}
