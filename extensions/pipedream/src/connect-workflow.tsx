import { showToast, Toast, useNavigation } from "@raycast/api";
import { useForm, FormValidation } from "@raycast/utils";
import { useWorkflowActions, useSavedWorkflows } from "./hooks/useSavedWorkflows";
import { SavedWorkflow } from "./types";
import { fetchWorkflowDetails } from "./services/api";
import { useUserInfo } from "./hooks/useUserInfo";
import { PIPEDREAM_BASE_URL } from "./utils/constants";
import { WorkflowForm, WorkflowFormValues } from "./components/WorkflowForm";

export default function ConnectWorkflow() {
  const { addWorkflow } = useWorkflowActions();
  const { orgId } = useUserInfo();
  const { pop } = useNavigation();
  const { workflows } = useSavedWorkflows();

  const { handleSubmit, itemProps } = useForm<WorkflowFormValues>({
    validation: {
      workflowId: FormValidation.Required,
      customName: FormValidation.Required,
    },
    onSubmit: async (values) => {
      const toast = await showToast({
        title: "Connecting workflow...",
        style: Toast.Style.Animated,
      });

      try {
        if (!orgId) throw new Error("Organization ID is missing. Please check your API key.");
        if (!values.workflowId.startsWith("p_")) throw new Error("Workflow ID must start with 'p_' (e.g., p_abc123)");

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
          throw new Error(`"${existing.customName}" (ID: ${existing.id}) is already in your workflow list`);
        }

        toast.style = Toast.Style.Success;
        toast.title = "Success";
        toast.message = `"${newWorkflow.customName}" has been connected successfully`;
        pop();
      } catch (error) {
        toast.style = Toast.Style.Failure;
        toast.title = "Failed to connect workflow";
        toast.message = error instanceof Error ? error.message : String(error);
      }
    },
  });

  return <WorkflowForm workflows={workflows} onSubmit={handleSubmit} isConnecting={true} itemProps={itemProps} />;
}
