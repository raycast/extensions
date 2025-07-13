import { List, ActionPanel, Action, Icon, showToast, Toast, useNavigation, Form } from "@raycast/api";
import { useUserInfo } from "./hooks/useUserInfo";
import { SavedWorkflow, WorkflowError } from "./types";
import { fetchWorkflowErrors } from "./services/api";
import { WorkflowList } from "./components/WorkflowList";
import ManageWorkflowsView from "./manage-workflows";
import { AIErrorSummaryAction } from "./components/AIErrorSummary";
import { useWorkflowActions, useSavedWorkflows } from "./hooks/useSavedWorkflows";
import { getExistingFolders } from "./utils/workflow";
import {
  categorizeError,
  determineSeverity,
  getErrorStatistics,
  formatErrorMessage,
  getErrorAge,
} from "./utils/error-management";

interface WorkflowAnalyticsProps {
  workflow: SavedWorkflow;
  errors: WorkflowError[];
}

function EditWorkflowName({
  currentName,
  onSave,
}: {
  currentName: string;
  onSave: (newName: string) => Promise<void>;
}) {
  const { pop } = useNavigation();

  const handleSubmit = async (values: { name: string }) => {
    await onSave(values.name);
    pop();
  };

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Save Name" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField id="name" title="Workflow Name" defaultValue={currentName} placeholder="Enter workflow name" />
    </Form>
  );
}

function EditWorkflowFolder({
  currentFolder,
  onSave,
}: {
  currentFolder: string;
  onSave: (newFolder: string) => Promise<void>;
}) {
  const { pop } = useNavigation();
  const { workflows } = useSavedWorkflows();
  const existingFolders = getExistingFolders(workflows);

  const handleSubmit = async (values: { folder: string }) => {
    await onSave(values.folder);
    pop();
  };

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Save Folder" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Dropdown
        id="folder"
        title="Folder"
        defaultValue={currentFolder}
        info="Select a folder to organize this workflow"
      >
        <Form.Dropdown.Item value="" title="No Folder" />
        {existingFolders.map(f => (
          <Form.Dropdown.Item key={f} value={f} title={f} />
        ))}
      </Form.Dropdown>
    </Form>
  );
}

export function WorkflowAnalyticsView({ workflow, errors }: WorkflowAnalyticsProps) {
  const { orgId } = useUserInfo();
  const { updateWorkflow } = useWorkflowActions();
  const { push } = useNavigation();

  // Calculate error statistics only from the displayed errors (last 100)
  const errorStats = getErrorStatistics(errors);
  const errorCategories = Object.entries(errorStats.categoryBreakdown).filter(([, count]) => count > 0);

  const handleEditName = () => {
    push(
      <EditWorkflowName
        currentName={workflow.customName}
        onSave={async (newName: string) => {
          try {
            await updateWorkflow({ ...workflow, customName: newName });
            showToast({ title: "Success", message: "Workflow name updated", style: Toast.Style.Success });
          } catch (error) {
            showToast({
              title: "Error",
              message: `Failed to update workflow name: ${error instanceof Error ? error.message : String(error)}`,
              style: Toast.Style.Failure,
            });
          }
        }}
      />
    );
  };

  const handleEditFolder = () => {
    push(
      <EditWorkflowFolder
        currentFolder={workflow.folder ?? ""}
        onSave={async (newFolder: string) => {
          try {
            await updateWorkflow({ ...workflow, folder: newFolder });
            showToast({ title: "Success", message: "Workflow folder updated", style: Toast.Style.Success });
          } catch (error) {
            showToast({
              title: "Error",
              message: `Failed to update workflow folder: ${error instanceof Error ? error.message : String(error)}`,
              style: Toast.Style.Failure,
            });
          }
        }}
      />
    );
  };

  return (
    <List>
      <List.Section title="Workflow Overview">
        <List.Item title="Workflow ID" subtitle={workflow.id} icon={Icon.Info} />
        <List.Item title="Triggers" subtitle={`${workflow.triggerCount} triggers`} icon={Icon.Bolt} />
        <List.Item title="Steps" subtitle={`${workflow.stepCount} steps`} icon={Icon.Cog} />
        <List.Item title="Last Updated" subtitle={new Date().toLocaleString()} icon={Icon.Clock} />
      </List.Section>

      {/* AI Error Summary - Only show if there are errors */}
      {errors.length > 0 && orgId && (
        <List.Section title="AI Analysis">
          <List.Item
            title="AI Error Summary"
            subtitle="Generate AI-powered analysis of error logs"
            icon={Icon.BarChart}
            actions={
              <ActionPanel>
                <AIErrorSummaryAction workflow={workflow} />
              </ActionPanel>
            }
          />
        </List.Section>
      )}

      {errorCategories.length > 0 && (
        <List.Section title={`Error Categories (last 100 errors)`}>
          {errorCategories.map(([category, count]) => (
            <List.Item
              key={category}
              title={category.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase())}
              subtitle={`${count} errors`}
              icon={Icon.Tag}
            />
          ))}
        </List.Section>
      )}

      <List.Section title="Recent Error Events">
        {errors.length > 0 ? (
          errors.slice(0, 10).map(error => {
            const category = categorizeError(error);
            const categoryErrors = errors.filter(e => categorizeError(e) === category);
            const severity = determineSeverity(error, categoryErrors.length);
            const errorAge = getErrorAge(error);

            return (
              <List.Item
                key={error.id}
                title={formatErrorMessage(error)}
                subtitle={`${errorAge} • ${category} • ${severity}`}
                icon={Icon.ExclamationMark}
                accessories={[
                  {
                    text: severity,
                    icon:
                      severity === "critical"
                        ? Icon.Xmark
                        : severity === "high"
                          ? Icon.ExclamationMark
                          : severity === "medium"
                            ? Icon.Warning
                            : Icon.Info,
                  },
                ]}
                actions={
                  <ActionPanel>
                    <Action.OpenInBrowser
                      url={`https://pipedream.com/@/event-history?status=error&id=${workflow.id}`}
                      title="View Full Error History"
                      icon={Icon.Globe}
                    />
                    <Action.OpenInBrowser url={workflow.url} title="Open Workflow in Pipedream" icon={Icon.Link} />
                  </ActionPanel>
                }
              />
            );
          })
        ) : (
          <List.Item
            title="No Recent Errors"
            subtitle="This workflow may not have encountered any errors recently"
            icon={Icon.Checkmark}
          />
        )}
      </List.Section>

      <List.Section title="Quick Actions">
        <List.Item
          title="Open in Pipedream"
          subtitle={workflow.url}
          icon={Icon.Globe}
          actions={
            <ActionPanel>
              <Action.OpenInBrowser url={workflow.url} title="Open Workflow" icon={Icon.Globe} />
            </ActionPanel>
          }
        />
        <List.Item
          title="Copy Workflow URL"
          subtitle="Copy workflow URL to clipboard"
          icon={Icon.Link}
          actions={
            <ActionPanel>
              <Action.CopyToClipboard content={workflow.url} title="Copy Workflow URL" icon={Icon.Link} />
            </ActionPanel>
          }
        />
        <List.Item
          title="View Error History"
          subtitle="View detailed error logs in Pipedream"
          icon={Icon.ExclamationMark}
          actions={
            <ActionPanel>
              <Action.OpenInBrowser
                url={`https://pipedream.com/@/event-history?status=error&id=${workflow.id}`}
                title="View Error History"
                icon={Icon.Globe}
              />
            </ActionPanel>
          }
        />
        <List.Item
          title="Edit Name"
          subtitle="Change the display name for this workflow"
          icon={Icon.Pencil}
          actions={
            <ActionPanel>
              <Action title="Edit Name" icon={Icon.Pencil} onAction={handleEditName} />
            </ActionPanel>
          }
        />
        <List.Item
          title="Edit Folder"
          subtitle="Move this workflow to a different folder"
          icon={Icon.Folder}
          actions={
            <ActionPanel>
              <Action title="Edit Folder" icon={Icon.Folder} onAction={handleEditFolder} />
            </ActionPanel>
          }
        />
        <List.Item
          title="Manage Workflows"
          subtitle="Go to workflow management"
          icon={Icon.List}
          actions={
            <ActionPanel>
              <Action.Push title="Manage Workflows" target={<ManageWorkflowsView />} icon={Icon.List} />
            </ActionPanel>
          }
        />
      </List.Section>
    </List>
  );
}

export default function WorkflowAnalytics() {
  const { orgId } = useUserInfo();
  const { push } = useNavigation();

  const loadWorkflowAnalytics = async (workflow: SavedWorkflow) => {
    if (!orgId) return;

    try {
      const errorHistory = await fetchWorkflowErrors(workflow.id, orgId);
      push(<WorkflowAnalyticsView workflow={workflow} errors={errorHistory.data} />);
    } catch (error) {
      showToast({
        title: "Error",
        message: `Failed to load analytics: ${error instanceof Error ? error.message : String(error)}`,
        style: Toast.Style.Failure,
      });
    }
  };

  return (
    <WorkflowList
      onWorkflowAction={loadWorkflowAnalytics}
      actionTitle="View Analytics"
      actionIcon={Icon.BarChart}
      showEdit={false}
      showDelete={false}
      showMenuBarToggle={false}
      showViewErrors={false}
    />
  );
}
