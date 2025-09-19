/**
 * Work item related Azure DevOps operations
 */

import { getPreferenceValues } from "@raycast/api";
import { runAz } from "../az-cli";
import { getCurrentUser } from "./user-operations";
import type { Preferences, WorkItemDetails, WorkItemLite } from "./types";

/**
 * Fetches detailed information about a work item
 */
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

/**
 * Activates a work item and assigns it to the current user
 */
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

/**
 * Fetches lightweight work item information
 */
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
