import { MenuBarExtra, Icon, open, showToast, Toast } from "@raycast/api";
import { useEffect, useState } from "react";
import { SavedWorkflow, WorkflowError } from "./types";
// import { fetchWorkflowErrors } from "./services/api";
import { smartRefreshManager } from "./services/smart-refresh";
import { useUserInfo } from "./hooks/useUserInfo";
import { useSavedWorkflows, useWorkflowActions } from "./hooks/useSavedWorkflows";
import { getErrorResolutionStatus } from "./utils/error-resolution";

// const SEVEN_DAYS_IN_MS = 7 * 24 * 60 * 60 * 1000;

export default function MenuBarWorkflows() {
  const { workflows, isLoading, refreshWorkflows } = useSavedWorkflows();
  const { toggleMenuBarVisibility, markWorkflowAsFixed, unmarkWorkflowAsFixed } = useWorkflowActions();
  const { orgId } = useUserInfo();
  const [workflowErrors, setWorkflowErrors] = useState<Record<string, { errorCount: number; errors: WorkflowError[] }>>(
    {},
  );
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  const fetchErrors = async () => {
    if (!orgId || !workflows || !workflows.length) return;

    try {
      await smartRefreshManager.smartRefresh(
        workflows,
        orgId,
        (workflowId: string, errorCount: number, errors: WorkflowError[]) => {
          setWorkflowErrors((prev) => ({
            ...prev,
            [workflowId]: {
              errorCount,
              errors,
            },
          }));
        },
      );

      setLastRefresh(new Date());
    } catch {
      showToast({
        title: "Error",
        message: "Failed to refresh error data",
        style: Toast.Style.Failure,
      });
    }
  };

  useEffect(() => {
    fetchErrors();

    // Set up auto-refresh every 5 minutes
    const interval = setInterval(fetchErrors, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [workflows, orgId]);

  const openUrl = (url: string) => {
    open(url);
  };

  const handleMarkAsFixed = async (workflowId: string, workflowName: string) => {
    const currentErrors = workflowErrors[workflowId]?.errors || [];
    await markWorkflowAsFixed(workflowId, currentErrors);
    showToast({
      title: "Success",
      message: `${workflowName} marked as fixed`,
      style: Toast.Style.Success,
    });
    await refreshWorkflows();
    await fetchErrors();
  };

  const handleUnmarkAsFixed = async (workflowId: string, workflowName: string) => {
    await unmarkWorkflowAsFixed(workflowId);
    showToast({
      title: "Success",
      message: `${workflowName} unmarked as fixed`,
      style: Toast.Style.Success,
    });
    await refreshWorkflows();
    await fetchErrors();
  };

  if (!orgId) {
    return (
      <MenuBarExtra title="Pipedream">
        <MenuBarExtra.Item title="Not Connected" icon={Icon.ExclamationMark} />
        <MenuBarExtra.Item title="Please configure API key" icon={Icon.Info} />
      </MenuBarExtra>
    );
  }

  if (isLoading || !workflows) {
    // Show a loading menu item so the menu is clickable
    return (
      <MenuBarExtra title="Pipedream">
        <MenuBarExtra.Item title="Loading..." icon={Icon.Clock} />
      </MenuBarExtra>
    );
  }

  const menuBarWorkflows = workflows.filter((workflow: SavedWorkflow) => workflow.showInMenuBar);

  // Group workflows by folder
  const workflowsByFolder: Record<string, SavedWorkflow[]> = {};
  for (const wf of menuBarWorkflows) {
    const folder = wf.folder || "No Folder";
    if (!workflowsByFolder[folder]) workflowsByFolder[folder] = [];
    workflowsByFolder[folder].push(wf);
  }
  const sortedFolderNames = Object.keys(workflowsByFolder).sort((a, b) => a.localeCompare(b));

  if (menuBarWorkflows.length === 0) {
    return (
      <MenuBarExtra title="Pipedream">
        <MenuBarExtra.Item title="No workflows in menu bar" icon={Icon.Info} />
        <MenuBarExtra.Item title="Add workflows from Manage Workflows" icon={Icon.Plus} />
        <MenuBarExtra.Separator />
        <MenuBarExtra.Item title="Refresh" icon={Icon.ArrowClockwise} onAction={fetchErrors} />
      </MenuBarExtra>
    );
  }

  return (
    <MenuBarExtra title="Pipedream">
      {sortedFolderNames.map((folder) => (
        <MenuBarExtra.Section key={folder} title={folder}>
          {workflowsByFolder[folder]?.map((workflow) => {
            const errorInfo = workflowErrors[workflow.id];
            const errorCount = errorInfo?.errorCount || 0;
            const currentErrors = errorInfo?.errors || [];
            const errorResolutionStatus = getErrorResolutionStatus(workflow, currentErrors);

            // Build simple title with error count
            let title = workflow.customName;

            if (errorResolutionStatus.isMarkedAsFixed) {
              if (errorResolutionStatus.hasNewErrors && errorResolutionStatus.newErrorsCount) {
                title += ` (${errorCount} - ${errorResolutionStatus.newErrorsCount} new)`;
              } else {
                title += ` (${errorCount} - Fixed)`;
              }
            } else if (errorCount > 0) {
              title += ` (${errorCount >= 100 ? "100+" : errorCount})`;
            }

            // Use simple icon based on error status
            const icon = errorCount > 0 ? Icon.ExclamationMark : Icon.Checkmark;

            return (
              <MenuBarExtra.Submenu key={workflow.id} title={title} icon={icon}>
                <MenuBarExtra.Item icon={Icon.Globe} title="Open Workflow" onAction={() => openUrl(workflow.url)} />

                {errorCount > 0 && (
                  <MenuBarExtra.Item
                    icon={Icon.ExclamationMark}
                    title="View Error Analytics"
                    onAction={() => open("raycast://extensions/olekristianbe/pipedream/manage-workflows")}
                  />
                )}

                {errorCount > 0 && !errorResolutionStatus.isMarkedAsFixed && (
                  <MenuBarExtra.Item
                    icon={Icon.Checkmark}
                    title="Mark Errors as Fixed"
                    onAction={() => handleMarkAsFixed(workflow.id, workflow.customName)}
                  />
                )}
                {errorResolutionStatus.isMarkedAsFixed && (
                  <MenuBarExtra.Item
                    icon={Icon.XMarkCircle}
                    title="Unmark as Fixed"
                    onAction={() => handleUnmarkAsFixed(workflow.id, workflow.customName)}
                  />
                )}

                <MenuBarExtra.Item
                  icon={Icon.EyeSlash}
                  title="Remove from Menu Bar"
                  onAction={() => {
                    toggleMenuBarVisibility(workflow.id);
                    refreshWorkflows();
                  }}
                />
              </MenuBarExtra.Submenu>
            );
          })}
        </MenuBarExtra.Section>
      ))}
      <MenuBarExtra.Separator />
      <MenuBarExtra.Section title="Actions">
        <MenuBarExtra.Item
          title="Refresh"
          icon={Icon.ArrowClockwise}
          onAction={fetchErrors}
          subtitle={`Last: ${lastRefresh.toLocaleTimeString()}`}
        />
        <MenuBarExtra.Item
          title="Manage Workflows"
          icon={Icon.List}
          onAction={() => open("raycast://extensions/olekristianbe/pipedream/manage-workflows")}
        />
        <MenuBarExtra.Item
          title="Connect Workflow"
          icon={Icon.Plus}
          onAction={() => open("raycast://extensions/olekristianbe/pipedream/connect-workflow")}
        />
      </MenuBarExtra.Section>
    </MenuBarExtra>
  );
}
