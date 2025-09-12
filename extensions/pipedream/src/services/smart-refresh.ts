/**
 * Smart refresh system that only fetches errors for workflows with recent activity
 */

import { SavedWorkflow, WorkflowError } from "../types";
import { requestQueue } from "./request-queue";
import { fetchWorkflowErrors } from "./api";

interface WorkflowActivity {
  workflowId: string;
  lastErrorCheck: number;
  lastErrorTime: number;
  errorCount: number;
  consecutiveEmptyChecks: number;
  priority: number;
}

class SmartRefreshManager {
  private activityMap = new Map<string, WorkflowActivity>();
  // private refreshInterval: NodeJS.Timeout | null = null;
  private isRefreshing = false;

  // Configuration
  private readonly maxConsecutiveEmptyChecks = 3;
  private readonly recentActivityThreshold = 24 * 60 * 60 * 1000; // 24 hours
  private readonly highPriorityInterval = 2 * 60 * 1000; // 2 minutes for active workflows
  private readonly lowPriorityInterval = 10 * 60 * 1000; // 10 minutes for inactive workflows

  /**
   * Update activity tracking for a workflow
   */
  updateActivity(workflowId: string, errorCount: number, lastErrorTime?: number): void {
    const existing = this.activityMap.get(workflowId);
    const now = Date.now();

    const activity: WorkflowActivity = {
      workflowId,
      lastErrorCheck: now,
      lastErrorTime: lastErrorTime || existing?.lastErrorTime || 0,
      errorCount,
      consecutiveEmptyChecks: errorCount === 0 ? (existing?.consecutiveEmptyChecks || 0) + 1 : 0,
      priority: this.calculatePriority(errorCount, lastErrorTime || existing?.lastErrorTime || 0),
    };

    this.activityMap.set(workflowId, activity);
  }

  /**
   * Calculate priority based on error count and recency
   */
  private calculatePriority(errorCount: number, lastErrorTime: number): number {
    if (errorCount === 0) return 1; // Low priority for error-free workflows

    const now = Date.now();
    const timeSinceLastError = now - lastErrorTime;

    // High priority for recent errors
    if (timeSinceLastError < this.recentActivityThreshold) {
      return 10 + errorCount; // Higher priority for more errors
    }

    // Medium priority for older errors
    return 5 + Math.min(errorCount, 5);
  }

  /**
   * Determine if a workflow should be refreshed based on activity
   */
  shouldRefresh(workflowId: string): boolean {
    const activity = this.activityMap.get(workflowId);
    if (!activity) return true; // Always refresh new workflows

    const now = Date.now();
    const timeSinceLastCheck = now - activity.lastErrorCheck;

    // Skip workflows that have been consistently empty
    if (activity.consecutiveEmptyChecks >= this.maxConsecutiveEmptyChecks) {
      return timeSinceLastCheck > this.lowPriorityInterval;
    }

    // Refresh high-priority workflows more frequently
    if (activity.priority >= 10) {
      return timeSinceLastCheck > this.highPriorityInterval;
    }

    return timeSinceLastCheck > this.lowPriorityInterval;
  }

  /**
   * Smart refresh that only fetches errors for workflows that need it
   */
  async smartRefresh(
    workflows: SavedWorkflow[],
    orgId: string,
    onUpdate: (workflowId: string, errorCount: number, errors: WorkflowError[]) => void,
  ): Promise<void> {
    if (this.isRefreshing) return;

    this.isRefreshing = true;

    try {
      const menuBarWorkflows = workflows.filter((w) => w.showInMenuBar);
      const workflowsToRefresh = menuBarWorkflows.filter((w) => this.shouldRefresh(w.id));

      if (workflowsToRefresh.length === 0) {
        return;
      }

      // Sort by priority for queue processing
      workflowsToRefresh.sort((a, b) => {
        const priorityA = this.activityMap.get(a.id)?.priority || 0;
        const priorityB = this.activityMap.get(b.id)?.priority || 0;
        return priorityB - priorityA;
      });

      // Queue requests with appropriate priority
      const promises = workflowsToRefresh.map((workflow) => {
        const activity = this.activityMap.get(workflow.id);
        const priority = activity?.priority || 0;

        return requestQueue.add(
          `workflow-errors-${workflow.id}`,
          async () => {
            try {
              const errorResponse = await fetchWorkflowErrors(workflow.id, orgId);
              const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
              const recentErrors = errorResponse.data.filter((error) => error.indexed_at_ms > sevenDaysAgo);

              // Update activity tracking
              const lastErrorTime = recentErrors.length > 0 ? recentErrors[0]?.indexed_at_ms || 0 : 0;
              this.updateActivity(workflow.id, recentErrors.length, lastErrorTime);

              // Notify callback
              onUpdate(workflow.id, recentErrors.length, recentErrors.slice(0, 5));

              return {
                workflowId: workflow.id,
                errorCount: recentErrors.length,
                errors: recentErrors.slice(0, 5),
              };
            } catch {
              // Update activity even on error
              this.updateActivity(workflow.id, 0);

              return {
                workflowId: workflow.id,
                errorCount: 0,
                errors: [],
              };
            }
          },
          priority,
          2, // Max 2 retries for error fetching
        );
      });

      await Promise.allSettled(promises);
    } finally {
      this.isRefreshing = false;
    }
  }

  /**
   * Get activity summary for debugging
   */
  getActivitySummary(): Record<string, WorkflowActivity> {
    const summary: Record<string, WorkflowActivity> = {};
    this.activityMap.forEach((activity, workflowId) => {
      summary[workflowId] = { ...activity };
    });
    return summary;
  }

  /**
   * Clear all activity tracking
   */
  clearActivity(): void {
    this.activityMap.clear();
  }

  /**
   * Remove activity tracking for a specific workflow
   */
  removeWorkflow(workflowId: string): void {
    this.activityMap.delete(workflowId);
  }
}

export const smartRefreshManager = new SmartRefreshManager();
