import { MenuBarExtra, Icon, open, Clipboard, showToast, Toast } from "@raycast/api";
import { useEffect, useState } from "react";
import { SavedWorkflow, WorkflowError } from "./types";
import { fetchWorkflowErrors } from "./services/api";
import { useUserInfo } from "./hooks/useUserInfo";
import { useSavedWorkflows, useWorkflowActions } from "./hooks/useSavedWorkflows";

export default function MenuBarWorkflows() {
  const { workflows, isLoading, refreshWorkflows } = useSavedWorkflows();
  const { toggleMenuBarVisibility } = useWorkflowActions();
  const { orgId } = useUserInfo();
  const [workflowErrors, setWorkflowErrors] = useState<Record<string, { errorCount: number; errors: WorkflowError[] }>>(
    {},
  );
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  const fetchErrors = async () => {
    if (!orgId || !workflows.length) return;

    try {
      const menuBarWorkflows = workflows.filter((w) => w.showInMenuBar);

      // Fetch errors for menu bar workflows in parallel
      const errorPromises = menuBarWorkflows.map(async (workflow) => {
        try {
          const errorResponse = await fetchWorkflowErrors(workflow.id, orgId);
          const recentErrors = errorResponse.data.filter(
            (error) => Date.now() - error.indexed_at_ms < 7 * 24 * 60 * 60 * 1000, // 7 days
          );
          return {
            workflowId: workflow.id,
            errorCount: recentErrors.length,
            errors: recentErrors.slice(0, 5), // Show last 5 errors
          };
        } catch (error) {
          console.error(`Failed to fetch errors for workflow ${workflow.id}:`, error);
          return {
            workflowId: workflow.id,
            errorCount: 0,
            errors: [],
          };
        }
      });

      const errorResults = await Promise.all(errorPromises);
      const errorData: Record<string, { errorCount: number; errors: WorkflowError[] }> = {};
      errorResults.forEach((result) => {
        errorData[result.workflowId] = {
          errorCount: result.errorCount,
          errors: result.errors,
        };
      });

      setWorkflowErrors(errorData);
      setLastRefresh(new Date());
    } catch (error) {
      console.error("Failed to fetch errors:", error);
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

  const getErrorUrl = (workflowId: string) => {
    return `https://pipedream.com/@/event-history?status=error&id=${workflowId}`;
  };

  const copyWorkflowUrl = async (url: string, workflowName: string) => {
    try {
      await Clipboard.copy(url);
      showToast({
        title: "Copied!",
        message: `${workflowName} URL copied to clipboard`,
        style: Toast.Style.Success,
      });
    } catch (error) {
      showToast({
        title: "Error",
        message: "Failed to copy URL",
        style: Toast.Style.Failure,
      });
    }
  };

  if (!orgId) {
    return (
      <MenuBarExtra title="Pipedream">
        <MenuBarExtra.Item title="Not Connected" icon={Icon.ExclamationMark} />
        <MenuBarExtra.Item title="Please configure API key" icon={Icon.Info} />
      </MenuBarExtra>
    );
  }

  if (isLoading) {
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
          {workflowsByFolder[folder].map((workflow) => {
            const errorInfo = workflowErrors[workflow.id];
            const errorCount = errorInfo?.errorCount ?? 0;
            return (
              <MenuBarExtra.Submenu
                key={workflow.id}
                title={`${workflow.customName} (${errorCount >= 100 ? "100+" : errorCount})`}
                icon={errorCount > 0 ? Icon.ExclamationMark : Icon.Checkmark}
              >
                <MenuBarExtra.Item icon={Icon.Globe} title="Open Workflow" onAction={() => openUrl(workflow.url)} />
                <MenuBarExtra.Item
                  icon={Icon.Link}
                  title="Copy Workflow URL"
                  onAction={() => copyWorkflowUrl(workflow.url, workflow.customName)}
                />
                {(errorCount ?? 0) > 0 && (
                  <MenuBarExtra.Item
                    icon={Icon.ExclamationMark}
                    title={`View ${errorCount} Errors in Browser`}
                    onAction={() => openUrl(getErrorUrl(workflow.id))}
                  />
                )}
                <MenuBarExtra.Separator />
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
          title="View Analytics"
          icon={Icon.BarChart}
          onAction={() => open("raycast://extensions/olekristianbe/pipedream/workflow-analytics")}
        />
      </MenuBarExtra.Section>
    </MenuBarExtra>
  );
}
