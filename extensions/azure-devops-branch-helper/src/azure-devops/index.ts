/**
 * Azure DevOps Operations - Barrel Export
 *
 * This file provides a centralized interface for all Azure DevOps operations.
 * It exports all functions and types from the modular components.
 */

// Export all types
export * from "./types";

// Export user operations
export * from "./user-operations";

// Export work item operations
export * from "./work-item-operations";

// Export branch operations
export * from "./branch-operations";

// Export pull request operations
export * from "./pull-request-operations";

// Export work item comments
export * from "./work-item-comments";

// Export work item relations
export * from "./work-item-relations";

// Export high-level workflows
export * from "./workflows";

/**
 * Legacy compatibility - re-export under original function names
 * This ensures existing imports continue to work during migration
 */
export { getCurrentUser } from "./user-operations";
export {
  fetchWorkItemDetails,
  activateWorkItem,
  getWorkItemLite,
} from "./work-item-operations";
export {
  convertToBranchName,
  findExistingBranchesForWorkItem,
  createBranch,
} from "./branch-operations";
export { createPullRequestFromWorkItem } from "./pull-request-operations";
export {
  getWorkItemCommentsCount,
  getWorkItemComments,
  addCommentToWorkItem,
} from "./work-item-comments";
export { getRelatedWorkItems } from "./work-item-relations";
export { activateAndCreatePR } from "./workflows";
