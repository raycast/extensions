import { List, ActionPanel, Action, Icon, showToast, Toast, useNavigation, Clipboard } from "@raycast/api";
import { SavedWorkflow, WorkflowError } from "../types";
import { useUserInfo } from "../hooks/useUserInfo";
import { fetchWorkflowErrors, exportWorkflowAsJSON } from "../services/api";
import { ErrorAnalyticsView } from "./ErrorAnalyticsView";
import { AIErrorSummaryAction } from "./AIErrorSummary";
import { getErrorResolutionStatus } from "../utils/error-resolution";
import { PIPEDREAM_ERROR_HISTORY_URL } from "../utils/constants";

interface WorkflowDetailViewProps {
  workflow: SavedWorkflow;
  errorCount: number;
  currentErrors?: WorkflowError[];
  onEdit?: () => void;
  onToggleMenuBar?: () => Promise<void>;
  onDelete?: () => void;
  onActivate?: () => void;
  onDeactivate?: () => void;
  onMarkAsFixed?: () => void;
  onUnmarkAsFixed?: () => void;
  onRefresh?: () => void;
}

export function WorkflowDetailView({
  workflow,
  errorCount,
  currentErrors = [],
  onEdit,
  onToggleMenuBar,
  onDelete,
  onActivate,
  onDeactivate,
  onMarkAsFixed,
  onUnmarkAsFixed,
  onRefresh,
}: WorkflowDetailViewProps) {
  const { orgId } = useUserInfo();
  const { push } = useNavigation();
  const errorResolutionStatus = getErrorResolutionStatus(workflow, currentErrors);

  const handleViewErrorAnalytics = async () => {
    if (!orgId) {
      showToast({
        title: "Organization ID not found",
        message: "Please ensure you are logged in and have an organization configured.",
        style: Toast.Style.Failure,
      });
      return;
    }

    const toast = await showToast({ title: "Loading error analytics...", style: Toast.Style.Animated });

    try {
      const errorHistory = await fetchWorkflowErrors(workflow.id, orgId);
      push(<ErrorAnalyticsView workflow={workflow} errors={errorHistory.data} />);
      toast.hide();
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Error";
      toast.message = `Failed to load error analytics: ${error instanceof Error ? error.message : String(error)}`;
    }
  };

  return (
    <List navigationTitle={workflow.customName}>
      {/* Workflow Overview */}
      <List.Section title="Workflow Overview">
        <List.Item
          title={workflow.customName}
          subtitle={`ID: ${workflow.id}`}
          icon={Icon.Info}
          accessories={[
            { text: workflow.folder || "No folder" },
            { text: `${workflow.triggerCount} triggers` },
            { text: `${workflow.stepCount} steps` },
            { icon: workflow.showInMenuBar ? Icon.Eye : Icon.EyeSlash },
          ]}
          actions={
            <ActionPanel>
              <Action.OpenInBrowser url={workflow.url} title="Open in Browser" icon={Icon.Globe} />
            </ActionPanel>
          }
        />
      </List.Section>

      {/* Error Management */}
      <List.Section title="Error Management">
        <List.Item
          title={errorCount > 0 ? "Errors Detected" : "No Recent Errors"}
          subtitle={
            errorCount > 0
              ? `${errorCount >= 100 ? "100+" : errorCount} errors in the last 7 days`
              : "This workflow is running smoothly"
          }
          icon={errorCount > 0 ? Icon.ExclamationMark : Icon.Checkmark}
          accessories={errorCount > 0 ? [{ text: `${errorCount >= 100 ? "100+" : errorCount}` }] : []}
          actions={
            <ActionPanel>
              {errorCount > 0 && (
                <Action title="View Error Analytics" icon={Icon.ExclamationMark} onAction={handleViewErrorAnalytics} />
              )}
              <Action.OpenInBrowser
                url={`${PIPEDREAM_ERROR_HISTORY_URL}${workflow.id}`}
                title="View Errors in Browser"
                icon={Icon.Globe}
              />
            </ActionPanel>
          }
        />
        {errorResolutionStatus.isMarkedAsFixed && (
          <List.Item
            title="Resolution Status"
            subtitle={
              errorResolutionStatus.hasNewErrors && errorResolutionStatus.newErrorsCount
                ? `Previously marked as fixed - ${errorResolutionStatus.newErrorsCount} new errors detected`
                : "Marked as fixed - no new errors"
            }
            icon={errorResolutionStatus.hasNewErrors ? Icon.ExclamationMark : Icon.Checkmark}
            actions={
              <ActionPanel>
                {onUnmarkAsFixed && (
                  <Action
                    title="Unmark as Fixed"
                    icon={Icon.XMarkCircle}
                    onAction={async () => {
                      if (onUnmarkAsFixed) {
                        onUnmarkAsFixed();
                        if (onRefresh) {
                          onRefresh();
                        }
                      }
                    }}
                  />
                )}
              </ActionPanel>
            }
          />
        )}
        {orgId && errorCount > 0 && (
          <List.Item
            title="AI Error Analysis"
            subtitle="Generate AI-powered analysis of error patterns and root causes"
            icon={Icon.Stars}
            actions={
              <ActionPanel>
                <AIErrorSummaryAction workflow={workflow} />
              </ActionPanel>
            }
          />
        )}
      </List.Section>

      {/* Workflow Management */}
      <List.Section title="Workflow Management">
        {onEdit && (
          <List.Item
            title="Edit Workflow"
            subtitle="Update name, folder, and menu bar visibility"
            icon={Icon.Pencil}
            actions={
              <ActionPanel>
                <Action title="Edit Workflow" icon={Icon.Pencil} onAction={onEdit} />
              </ActionPanel>
            }
          />
        )}
        {onToggleMenuBar && (
          <List.Item
            title={workflow.showInMenuBar ? "Remove from Menu Bar" : "Add to Menu Bar"}
            subtitle={
              workflow.showInMenuBar ? "Hide this workflow from the menu bar" : "Show this workflow in the menu bar"
            }
            icon={workflow.showInMenuBar ? Icon.EyeSlash : Icon.Eye}
            actions={
              <ActionPanel>
                <Action
                  title={workflow.showInMenuBar ? "Remove from Menu Bar" : "Add to Menu Bar"}
                  icon={workflow.showInMenuBar ? Icon.EyeSlash : Icon.Eye}
                  onAction={async () => {
                    if (onToggleMenuBar) {
                      await onToggleMenuBar();
                      if (onRefresh) {
                        onRefresh();
                      }
                    }
                  }}
                />
              </ActionPanel>
            }
          />
        )}
        {errorCount > 0 && onMarkAsFixed && !errorResolutionStatus.isMarkedAsFixed && (
          <List.Item
            title="Mark Errors as Fixed"
            subtitle="Mark all current errors as resolved"
            icon={Icon.Checkmark}
            actions={
              <ActionPanel>
                <Action
                  title="Mark as Fixed"
                  icon={Icon.Checkmark}
                  onAction={async () => {
                    if (onMarkAsFixed) {
                      onMarkAsFixed();
                      if (onRefresh) {
                        onRefresh();
                      }
                    }
                  }}
                />
              </ActionPanel>
            }
          />
        )}
      </List.Section>

      {/* Advanced Actions */}
      <List.Section title="Advanced Actions">
        {onActivate && (
          <List.Item
            title="Activate Workflow"
            subtitle="Enable this workflow in Pipedream"
            icon={Icon.Play}
            actions={
              <ActionPanel>
                <Action title="Activate" icon={Icon.Play} onAction={onActivate} />
              </ActionPanel>
            }
          />
        )}
        {onDeactivate && (
          <List.Item
            title="Deactivate Workflow"
            subtitle="Temporarily disable this workflow"
            icon={Icon.Pause}
            actions={
              <ActionPanel>
                <Action title="Deactivate" icon={Icon.Pause} onAction={onDeactivate} />
              </ActionPanel>
            }
          />
        )}
        <List.Item
          title="Copy Workflow ID"
          subtitle="Copy the workflow ID to clipboard"
          icon={Icon.Hashtag}
          actions={
            <ActionPanel>
              <Action.CopyToClipboard content={workflow.id} title="Copy ID" icon={Icon.Hashtag} />
            </ActionPanel>
          }
        />
        <List.Item
          title="Copy Workflow URL"
          subtitle="Copy the Pipedream workflow URL to clipboard"
          icon={Icon.Link}
          actions={
            <ActionPanel>
              <Action.CopyToClipboard content={workflow.url} title="Copy URL" icon={Icon.Link} />
            </ActionPanel>
          }
        />
        {orgId && (
          <List.Item
            title="Export Workflow as JSON"
            subtitle="Export complete workflow configuration to JSON format"
            icon={Icon.Download}
            actions={
              <ActionPanel>
                <Action
                  title="Export as JSON"
                  icon={Icon.Download}
                  onAction={async () => {
                    await showToast({ title: "Exporting workflow...", style: Toast.Style.Animated });
                    try {
                      const jsonData = await exportWorkflowAsJSON(workflow.id, orgId);
                      await showToast({
                        title: "Success",
                        message: "Workflow JSON copied to clipboard",
                        style: Toast.Style.Success,
                      });
                      await Clipboard.copy(jsonData);
                    } catch (error) {
                      await showToast({
                        title: "Export Failed",
                        message: `Failed to export workflow: ${error instanceof Error ? error.message : String(error)}`,
                        style: Toast.Style.Failure,
                      });
                    }
                  }}
                />
              </ActionPanel>
            }
          />
        )}
        {onDelete && (
          <List.Item
            title="Remove from Extension"
            subtitle="Remove this workflow from the extension list"
            icon={Icon.Trash}
            actions={
              <ActionPanel>
                <Action title="Remove" icon={Icon.Trash} onAction={onDelete} style={Action.Style.Destructive} />
              </ActionPanel>
            }
          />
        )}
      </List.Section>
    </List>
  );
}
