import { showToast, Toast, useNavigation } from "@raycast/api";
import { useWorkflowActions, useSavedWorkflows } from "./hooks/useSavedWorkflows";
import { SavedWorkflow } from "./types";
import { fetchWorkflowDetails } from "./services/api";
import { useUserInfo } from "./hooks/useUserInfo";
import { PIPEDREAM_BASE_URL } from "./utils/constants";
import { showFailureToast } from "@raycast/utils";
import { WorkflowForm } from "./components/WorkflowForm";

export default function ConnectWorkflow() {
  const { addWorkflow } = useWorkflowActions();
  const { orgId } = useUserInfo();
  const { pop } = useNavigation();
  const { workflows } = useSavedWorkflows();

  const handleSubmit = async (values: {
    workflowId: string;
    customName: string;
    folder: string;
    showInMenuBar: boolean;
  }) => {
    if (!orgId) {
      showFailureToast("Organization ID is missing. Please check your API key.");
      return;
    }

    if (!values.workflowId.startsWith("p_")) {
      showFailureToast("Workflow ID must start with 'p_' (e.g., p_abc123)");
      return;
    }

    try {
      const workflowDetails = await fetchWorkflowDetails(values.workflowId, orgId);

      const newWorkflow: SavedWorkflow = {
        id: values.workflowId,
        customName: values.customName,
        folder: values.folder,
        url: `${PIPEDREAM_BASE_URL}${values.workflowId}`,
        triggerCount: workflowDetails.triggers?.length || 0,
        stepCount: workflowDetails.steps?.length || 0,
        showInMenuBar: values.showInMenuBar,
        sortOrder: 0,
      };

      const existing = await addWorkflow(newWorkflow);

      if (existing) {
        showFailureToast(`"${existing.customName}" (ID: ${existing.id}) is already in your workflow list`);
      } else {
        showToast({
          title: "Success",
          message: `"${newWorkflow.customName}" has been connected successfully`,
          style: Toast.Style.Success,
        });
        pop();
      }
    } catch (error) {
      showFailureToast(`Failed to connect workflow: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  return <WorkflowForm workflows={workflows} onSubmit={handleSubmit} isConnecting={true} />;
}
