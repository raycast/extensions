import { WorkflowList } from "./components/WorkflowList";
import { useNavigation, showToast, Toast, confirmAlert, Alert } from "@raycast/api";
import { SavedWorkflow } from "./types";
import { useWorkflowActions, useSavedWorkflows } from "./hooks/useSavedWorkflows";
import { useUserInfo } from "./hooks/useUserInfo";
import { WorkflowForm } from "./components/WorkflowForm";
import { WorkflowDetailView } from "./components/WorkflowDetailView";
import { useWorkflowErrors } from "./hooks/useWorkflowErrors";
import { activateWorkflow, deactivateWorkflow } from "./services/api";

export default function ManageWorkflows() {
  const { push, pop } = useNavigation();
  const { workflows, refreshWorkflows } = useSavedWorkflows();
  const { updateWorkflow, removeWorkflow, toggleMenuBarVisibility, markWorkflowAsFixed, unmarkWorkflowAsFixed } =
    useWorkflowActions();
  const { orgId } = useUserInfo();
  const { errorInfo, refreshErrorInfo } = useWorkflowErrors(workflows, orgId ?? undefined);

  const handleEdit = (workflow: SavedWorkflow) => {
    push(
      <WorkflowForm
        workflow={workflow}
        workflows={workflows}
        onSubmit={async (values) => {
          try {
            await updateWorkflow({ ...workflow, ...values });
            showToast({ title: "Success", message: "Workflow updated", style: Toast.Style.Success });
            pop(); // Close the form on success
            refreshWorkflows(); // Refresh the list
          } catch (error) {
            showToast({
              title: "Error",
              message: `Failed to update workflow: ${error instanceof Error ? error.message : String(error)}`,
              style: Toast.Style.Failure,
            });
          }
        }}
      />,
    );
  };

  const handleViewDetails = (workflow: SavedWorkflow) => {
    const workflowErrors = errorInfo[workflow.id];
    const errorCount = workflowErrors?.count ?? 0;
    const currentErrors = workflowErrors?.errors || [];

    push(
      <WorkflowDetailView
        workflow={workflow}
        errorCount={errorCount}
        currentErrors={currentErrors}
        onEdit={() => handleEdit(workflow)}
        onToggleMenuBar={async () => {
          const wasVisible = workflow.showInMenuBar;
          await toggleMenuBarVisibility(workflow.id);
          await refreshWorkflows();
          showToast({
            title: "Success",
            message: wasVisible
              ? `${workflow.customName} removed from menu bar`
              : `${workflow.customName} added to menu bar`,
            style: Toast.Style.Success,
          });
        }}
        onRefresh={() => {
          refreshWorkflows();
          refreshErrorInfo();
        }}
        onDelete={() => handleDelete(workflow.id)}
        onActivate={() => handleActivate(workflow.id)}
        onDeactivate={() => handleDeactivate(workflow.id)}
        onMarkAsFixed={() => handleMarkAsFixed(workflow.id)}
        onUnmarkAsFixed={() => handleUnmarkAsFixed(workflow.id)}
      />,
    );
  };

  const handleDelete = async (workflowId: string) => {
    const workflow = workflows.find((w) => w.id === workflowId);
    if (!workflow) return;

    const options: Alert.Options = {
      title: "Remove Workflow from Extension",
      message: `Are you sure you want to remove "${workflow.customName}" from the extension? This will not delete the workflow from Pipedream, only from this list.`,
      primaryAction: {
        title: "Remove",
        style: Alert.ActionStyle.Destructive,
      },
    };

    if (await confirmAlert(options)) {
      await removeWorkflow(workflowId);
      showToast({
        title: "Success",
        message: "Workflow removed from extension list",
        style: Toast.Style.Success,
      });
      await refreshErrorInfo();
    }
  };

  const handleActivate = async (workflowId: string) => {
    if (!orgId) return;
    const workflow = workflows.find((w) => w.id === workflowId);
    if (!workflow) return;

    try {
      await activateWorkflow(workflowId, orgId);
      showToast({
        title: "Success",
        message: `${workflow.customName} activated`,
        style: Toast.Style.Success,
      });
    } catch (error) {
      showToast({
        title: "Error",
        message: `Failed to activate workflow: ${error instanceof Error ? error.message : String(error)}`,
        style: Toast.Style.Failure,
      });
    }
  };

  const handleDeactivate = async (workflowId: string) => {
    if (!orgId) return;
    const workflow = workflows.find((w) => w.id === workflowId);
    if (!workflow) return;

    try {
      await deactivateWorkflow(workflowId, orgId);
      showToast({
        title: "Success",
        message: `${workflow.customName} deactivated`,
        style: Toast.Style.Success,
      });
    } catch (error) {
      showToast({
        title: "Error",
        message: `Failed to deactivate workflow: ${error instanceof Error ? error.message : String(error)}`,
        style: Toast.Style.Failure,
      });
    }
  };

  const handleMarkAsFixed = async (workflowId: string) => {
    const workflow = workflows.find((w) => w.id === workflowId);
    if (!workflow) return;

    const currentErrors = errorInfo[workflowId]?.errors || [];
    await markWorkflowAsFixed(workflowId, currentErrors);
    showToast({
      title: "Success",
      message: "Workflow marked as fixed",
      style: Toast.Style.Success,
    });
    await refreshWorkflows();
    await refreshErrorInfo();
  };

  const handleUnmarkAsFixed = async (workflowId: string) => {
    await unmarkWorkflowAsFixed(workflowId);
    showToast({
      title: "Success",
      message: "Workflow unmarked as fixed",
      style: Toast.Style.Success,
    });
    await refreshWorkflows();
    await refreshErrorInfo();
  };

  return <WorkflowList onWorkflowAction={handleViewDetails} showEdit={false} showViewErrors={false} />;
}
