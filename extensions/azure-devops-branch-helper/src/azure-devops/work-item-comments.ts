/**
 * Work item comments related Azure DevOps operations
 */

import { getPreferenceValues } from "@raycast/api";
import { promises as fs } from "fs";
import os from "os";
import path from "path";
import { runAz } from "../az-cli";
import type { Preferences, WorkItemComment, CommentResult } from "./types";

/**
 * Gets the count of comments for a work item
 */
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

/**
 * Gets all comments for a work item
 */
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

/**
 * Adds a comment to a work item
 */
export async function addCommentToWorkItem(
  workItemId: number,
  comment: string,
): Promise<CommentResult> {
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

    const errorObj = e as { stderr?: string; message?: string };
    const msg =
      typeof errorObj?.stderr === "string" && errorObj.stderr
        ? errorObj.stderr
        : errorObj?.message || String(e);
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
