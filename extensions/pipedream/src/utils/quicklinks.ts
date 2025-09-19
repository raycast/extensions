/**
 * Quicklinks generation for workflow access
 */

// Note: createDeeplink might not be available in current API version
// Using manual deeplink construction for now

export interface QuickLink {
  name: string;
  link: string;
  description?: string;
}

/**
 * Generate a quicklink for connecting a workflow
 */
export function generateConnectWorkflowQuicklink(workflowUrl: string, workflowName?: string): QuickLink {
  const deeplink = `raycast://extensions/olekristianbe/pipedream/connect-workflow?arguments=${encodeURIComponent(JSON.stringify({ workflowUrl }))}`;

  return {
    name: `Connect: ${workflowName || "Workflow"}`,
    link: deeplink,
    description: `Quick connect workflow from ${workflowUrl}`,
  };
}

/**
 * Generate a quicklink for opening workflow analytics
 */
export function generateAnalyticsQuicklink(workflowId?: string): QuickLink {
  const deeplink = workflowId
    ? `raycast://extensions/olekristianbe/pipedream/workflow-analytics?arguments=${encodeURIComponent(JSON.stringify({ workflowId }))}`
    : `raycast://extensions/olekristianbe/pipedream/workflow-analytics`;

  return {
    name: "Workflow Analytics",
    link: deeplink,
    description: workflowId ? `View analytics for workflow ${workflowId}` : "View all workflow analytics",
  };
}

/**
 * Generate a quicklink for managing workflows
 */
export function generateManageWorkflowsQuicklink(): QuickLink {
  const deeplink = `raycast://extensions/olekristianbe/pipedream/manage-workflows`;

  return {
    name: "Manage Workflows",
    link: deeplink,
    description: "Organize and manage your Pipedream workflows",
  };
}

/**
 * Generate a quicklink for error analytics
 */
export function generateErrorAnalyticsQuicklink(workflowId?: string): QuickLink {
  const deeplink = workflowId
    ? `raycast://extensions/olekristianbe/pipedream/error-analytics?arguments=${encodeURIComponent(JSON.stringify({ workflowId }))}`
    : `raycast://extensions/olekristianbe/pipedream/error-analytics`;

  return {
    name: "Error Analytics",
    link: deeplink,
    description: workflowId ? `View error analytics for workflow ${workflowId}` : "View comprehensive error analytics",
  };
}

/**
 * Generate quicklinks for frequently used workflows
 */
export function generateFrequentWorkflowQuicklinks(
  workflows: { id: string; customName: string; url: string }[],
): QuickLink[] {
  return workflows.map((workflow) => ({
    name: `Open: ${workflow.customName}`,
    link: workflow.url,
    description: `Direct link to ${workflow.customName} in Pipedream`,
  }));
}

/**
 * Generate a collection of all available quicklinks
 */
export function generateAllQuicklinks(
  frequentWorkflows?: { id: string; customName: string; url: string }[],
): QuickLink[] {
  const quicklinks: QuickLink[] = [
    generateManageWorkflowsQuicklink(),
    generateAnalyticsQuicklink(),
    generateErrorAnalyticsQuicklink(),
  ];

  if (frequentWorkflows && frequentWorkflows.length > 0) {
    quicklinks.push(...generateFrequentWorkflowQuicklinks(frequentWorkflows));
  }

  return quicklinks;
}

/**
 * Format quicklinks for copying to clipboard
 */
export function formatQuicklinksForClipboard(quicklinks: QuickLink[]): string {
  return quicklinks
    .map((link) => `${link.name}: ${link.link}${link.description ? ` - ${link.description}` : ""}`)
    .join("\n");
}

/**
 * Generate a quicklink for a specific workflow's error dashboard
 */
export function generateWorkflowErrorQuicklink(workflowId: string, workflowName: string): QuickLink {
  const deeplink = `raycast://extensions/olekristianbe/pipedream/error-analytics?arguments=${encodeURIComponent(JSON.stringify({ workflowId }))}`;

  return {
    name: `${workflowName} Errors`,
    link: deeplink,
    description: `View error dashboard for ${workflowName}`,
  };
}
