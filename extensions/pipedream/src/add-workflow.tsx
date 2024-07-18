import { Form, ActionPanel, Action, showToast, Toast, useNavigation } from "@raycast/api";
import { useState, useEffect } from "react";
import { useUserInfo } from "./hooks/useUserInfo";
import { fetchWorkflowDetails } from "./services/api";
import { useWorkflowActions } from "./hooks/useSavedWorkflows";
import { SavedWorkflow } from "./types";
import { WORKFLOW_ID_PREFIX, PIPEDREAM_BASE_URL } from "./utils/constants";

function SuccessView({ workflow, isUpdate }: { workflow: SavedWorkflow; isUpdate: boolean }) {
  const { pop } = useNavigation();
  return (
    <Form
      actions={
        <ActionPanel>
          <Action title="Back to Add Workflow" onAction={pop} />
        </ActionPanel>
      }
    >
      <Form.Description
        title={isUpdate ? "Workflow Updated Successfully" : "Workflow Added Successfully"}
        text={`ID: ${workflow.id}\nCustom Name: ${workflow.customName}\nTriggers: ${workflow.triggerCount}\nSteps: ${workflow.stepCount}\nShow in Menu Bar: Yes`}
      />
    </Form>
  );
}

export default function AddWorkflow() {
  const [workflowId, setWorkflowId] = useState("");
  const [customName, setCustomName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const { addWorkflow, updateWorkflow } = useWorkflowActions();
  const { orgId, isLoading: isLoadingUserInfo, error: userInfoError } = useUserInfo();
  const { push } = useNavigation();

  useEffect(() => {
    if (userInfoError) {
      setError(`Error loading user info: ${String(userInfoError)}`);
    } else if (!isLoadingUserInfo && !orgId) {
      setError("Unable to retrieve organization information. Please try again later.");
    } else {
      setError(null);
    }
  }, [isLoadingUserInfo, userInfoError, orgId]);

  const handleSubmit = async () => {
    if (!workflowId.trim() || !customName.trim()) {
      setError("Please enter both Workflow ID and Custom Name");
      return;
    }
    if (!workflowId.startsWith(WORKFLOW_ID_PREFIX)) {
      setError(`Workflow ID must start with '${WORKFLOW_ID_PREFIX}'`);
      return;
    }
    if (!orgId) {
      setError("Organization ID is missing. Please try again later.");
      return;
    }
    setError(null);
    setIsLoading(true);

    try {
      const workflowData = await fetchWorkflowDetails(workflowId, orgId);
      const newWorkflow: SavedWorkflow = {
        id: workflowId,
        customName: customName,
        url: `${PIPEDREAM_BASE_URL}${workflowId}`,
        triggerCount: workflowData.triggers?.length || 0,
        stepCount: workflowData.steps?.length || 0,
        showInMenuBar: true,
        sortOrder: 0,
      };

      const existingWorkflow = await addWorkflow(newWorkflow);
      const isUpdate = !!existingWorkflow;

      if (isUpdate) {
        await updateWorkflow(newWorkflow);
        showToast({ title: "Success", message: "Workflow updated", style: Toast.Style.Success });
      } else {
        showToast({ title: "Success", message: "New workflow added", style: Toast.Style.Success });
      }

      setWorkflowId("");
      setCustomName("");
      push(<SuccessView workflow={newWorkflow} isUpdate={isUpdate} />);
    } catch (error) {
      console.error("Error adding/updating workflow:", error);
      setError("Failed to add/update workflow. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoadingUserInfo) {
    return <Form isLoading={true} />;
  }

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Add/Update Workflow" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="workflowId"
        title="Workflow ID"
        placeholder="Enter Workflow ID"
        value={workflowId}
        onChange={setWorkflowId}
        autoFocus
      />
      <Form.TextField
        id="customName"
        title="Custom Name"
        placeholder="Enter a custom name for this workflow"
        value={customName}
        onChange={setCustomName}
      />
      <Form.Description
        title="What is Custom Name?"
        text="This name is used only within this extension and does not affect the workflow name in Pipedream."
      />
      <Form.Description
        title="Finding Your Workflow ID"
        text={`The Workflow ID starts with '${WORKFLOW_ID_PREFIX}' and can be found in the URL of your workflow on Pipedream.`}
      />
      {error && <Form.Description title="Error" text={`❗️ ${error}`} />}
    </Form>
  );
}
