/**
 * Icon and color utilities for consistent UI across the application
 */

import { Icon, Color } from "@raycast/api";

/**
 * Gets the appropriate icon for a work item type
 * @param type - The work item type (e.g., "User Story", "Bug", "Task")
 * @returns The corresponding Raycast Icon
 */
export function getWorkItemTypeIcon(type: string): Icon {
  const normalizedType = type?.toLowerCase() || "";

  if (normalizedType.includes("epic")) return Icon.Crown;
  if (normalizedType.includes("feature")) return Icon.Layers;
  if (
    normalizedType.includes("story") ||
    normalizedType.includes("product backlog item")
  )
    return Icon.PersonCircle;
  if (normalizedType.includes("bug")) return Icon.Bug;
  if (normalizedType.includes("task")) return Icon.CheckCircle;
  if (normalizedType.includes("test")) return Icon.BugOff;
  if (normalizedType.includes("issue")) return Icon.ExclamationMark;
  if (normalizedType.includes("impediment")) return Icon.Warning;

  return Icon.Document;
}

/**
 * Gets the color for a work item state
 * @param state - The work item state (e.g., "Active", "New", "Closed")
 * @returns The corresponding Raycast Color
 */
export function getStateColor(state: string): Color {
  const normalizedState = state?.toLowerCase() || "";

  // Active/In Progress states
  if (
    normalizedState === "active" ||
    normalizedState === "in progress" ||
    normalizedState === "doing"
  ) {
    return Color.Blue;
  }

  // New/Open states
  if (
    normalizedState === "new" ||
    normalizedState === "to do" ||
    normalizedState === "open" ||
    normalizedState === "approved"
  ) {
    return Color.Green;
  }

  // Closed/Done states
  if (
    normalizedState === "closed" ||
    normalizedState === "done" ||
    normalizedState === "resolved" ||
    normalizedState === "completed"
  ) {
    return Color.SecondaryText;
  }

  // Removed/Cancelled states
  if (normalizedState === "removed" || normalizedState === "cancelled") {
    return Color.Red;
  }

  // Design/Review states
  if (
    normalizedState === "design" ||
    normalizedState === "in review" ||
    normalizedState === "awaiting review"
  ) {
    return Color.Purple;
  }

  // Testing states
  if (normalizedState === "testing" || normalizedState === "ready for test") {
    return Color.Orange;
  }

  // Blocked states
  if (normalizedState === "blocked" || normalizedState === "on hold") {
    return Color.Red;
  }

  return Color.PrimaryText;
}

/**
 * Gets the icon for a pull request status
 * @param status - The PR status (e.g., "active", "completed", "abandoned")
 * @param isDraft - Whether the PR is a draft
 * @returns The corresponding Raycast Icon
 */
export function getPullRequestStatusIcon(
  status: string,
  isDraft: boolean = false,
): Icon {
  if (isDraft) return Icon.Pencil;

  const normalizedStatus = status?.toLowerCase() || "";

  switch (normalizedStatus) {
    case "active":
    case "open":
      return Icon.Circle;
    case "completed":
    case "merged":
      return Icon.CheckCircle;
    case "abandoned":
    case "closed":
      return Icon.XMarkCircle;
    default:
      return Icon.Document;
  }
}

/**
 * Gets the color for a pull request status
 * @param status - The PR status
 * @returns The corresponding Raycast Color
 */
export function getPullRequestStatusColor(status: string): Color {
  const normalizedStatus = status?.toLowerCase() || "";

  switch (normalizedStatus) {
    case "active":
    case "open":
      return Color.Green;
    case "completed":
    case "merged":
      return Color.Purple;
    case "abandoned":
    case "closed":
      return Color.Red;
    default:
      return Color.PrimaryText;
  }
}

/**
 * Gets the icon for a build status
 * @param status - The build status (e.g., "succeeded", "failed", "inProgress")
 * @returns The corresponding Raycast Icon
 */
export function getBuildStatusIcon(status: string): Icon {
  const normalizedStatus = status?.toLowerCase() || "";

  switch (normalizedStatus) {
    case "succeeded":
    case "success":
      return Icon.CheckCircle;
    case "failed":
    case "failure":
      return Icon.XMarkCircle;
    case "partiallysucceeded":
    case "partiallySucceeded":
      return Icon.ExclamationMark;
    case "canceled":
    case "cancelled":
      return Icon.MinusCircle;
    case "inprogress":
    case "inProgress":
    case "running":
      return Icon.CircleProgress;
    case "notstarted":
    case "notStarted":
    case "pending":
      return Icon.Clock;
    default:
      return Icon.QuestionMarkCircle;
  }
}

/**
 * Gets the color for a build result
 * @param result - The build result
 * @returns The corresponding Raycast Color
 */
export function getBuildResultColor(result: string): Color {
  const normalizedResult = result?.toLowerCase() || "";

  switch (normalizedResult) {
    case "succeeded":
    case "success":
      return Color.Green;
    case "failed":
    case "failure":
      return Color.Red;
    case "partiallysucceeded":
    case "partiallySucceeded":
      return Color.Orange;
    case "canceled":
    case "cancelled":
      return Color.SecondaryText;
    default:
      return Color.PrimaryText;
  }
}

/**
 * Gets an emoji representation for a build status
 * @param status - The build status
 * @returns An emoji string
 */
export function getBuildStatusEmoji(status: string): string {
  const normalizedStatus = status?.toLowerCase() || "";

  switch (normalizedStatus) {
    case "succeeded":
    case "success":
      return "🟢";
    case "failed":
    case "failure":
      return "🔴";
    case "partiallysucceeded":
    case "partiallySucceeded":
      return "🟡";
    case "canceled":
    case "cancelled":
      return "⚫";
    case "inprogress":
    case "inProgress":
    case "running":
      return "🔵";
    case "notstarted":
    case "notStarted":
    case "pending":
      return "⚪";
    default:
      return "⚪";
  }
}

/**
 * Gets an emoji representation for a pull request status
 * @param status - The PR status
 * @param isDraft - Whether the PR is a draft
 * @returns An emoji string
 */
export function getPullRequestStatusEmoji(
  status: string,
  isDraft: boolean = false,
): string {
  if (isDraft) return "📝";

  const normalizedStatus = status?.toLowerCase() || "";
  switch (normalizedStatus) {
    case "active":
    case "open":
      return "🔄";
    case "completed":
    case "merged":
      return "✅";
    case "abandoned":
    case "closed":
      return "❌";
    default:
      return "⚪";
  }
}
