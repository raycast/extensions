import { Form, ActionPanel, Action, showToast, Toast, useNavigation } from "@raycast/api";
import { useState, useEffect } from "react";
import { useUserInfo } from "./hooks/useUserInfo";
import { fetchWorkflowDetails } from "./services/api";
import { useWorkflowActions } from "./hooks/useSavedWorkflows";
import { SavedWorkflow } from "./types";
import { WORKFLOW_ID_PREFIX, PIPEDREAM_BASE_URL } from "./utils/constants";

export default function AddWorkflow() {
  const [workflowId, setWorkflowId] = useState("");
  const [customName, setCustomName] = useState("");
  const [workflowIdError, setWorkflowIdError] = useState<string | undefined>();
  const [customNameError, setCustomNameError] = useState<string | undefined>();
  const [apiError, setApiError] = useState<string | undefined>();
  const [isLoading, setIsLoading] = useState(false);

  const { addWorkflow, updateWorkflow } = useWorkflowActions();
  const { orgId, isLoading: isLoadingUserInfo, error: userInfoError } = useUserInfo();
  const { pop } = useNavigation();

  useEffect(() => {
    if (userInfoError) {
      setApiError(`Error loading user info: ${String(userInfoError)}`);
    } else if (!isLoadingUserInfo && !orgId) {
      setApiError("Unable to retrieve organization information. Please try again later.");
    } else {
      setApiError(undefined);
    }
  }, [isLoadingUserInfo, userInfoError, orgId]);

  const validateForm = () => {
    let isValid = true;

    if (!workflowId.trim()) {
      setWorkflowIdError("Please enter a Workflow ID");
      isValid = false;
    } else if (!workflowId.startsWith(WORKFLOW_ID_PREFIX)) {
      setWorkflowIdError(`Workflow ID must start with '${WORKFLOW_ID_PREFIX}'`);
      isValid = false;
    } else {
      setWorkflowIdError(undefined);
    }

    if (!customName.trim()) {
      setCustomNameError("Please enter a Custom Name");
      isValid = false;
    } else {
      setCustomNameError(undefined);
    }

    return isValid;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setApiError(undefined);

    if (!orgId) {
      setApiError("Organization ID is missing. Please try again later.");
      return;
    }

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
      pop();
    } catch (error) {
      setApiError("Failed to add/update workflow. Please try again.");
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
        onChange={(newValue) => {
          setWorkflowId(newValue);
          setWorkflowIdError(undefined);
        }}
        error={workflowIdError}
        autoFocus
        info={`The Workflow ID starts with '${WORKFLOW_ID_PREFIX}' and can be found in the URL of your workflow on Pipedream.`}
      />

      <Form.TextField
        id="customName"
        title="Custom Name"
        placeholder="Enter a custom name for this workflow"
        value={customName}
        onChange={(newValue) => {
          setCustomName(newValue);
          setCustomNameError(undefined);
        }}
        error={customNameError}
        info="This name is used only within this extension and does not affect the workflow name in Pipedream."
      />

      {apiError && <Form.Description title="Error" text={apiError} />}
    </Form>
  );
}
