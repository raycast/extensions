import { Form, ActionPanel, Action, showToast, Toast, useNavigation } from "@raycast/api";
import { useWorkflowActions, useSavedWorkflows } from "./hooks/useSavedWorkflows";
import { SavedWorkflow } from "./types";
import { fetchWorkflowDetails } from "./services/api";
import { useUserInfo } from "./hooks/useUserInfo";
import { getExistingFolders } from "./utils/workflow";
import { useState } from "react";
import { showFailureToast } from "@raycast/utils";

export default function ConnectWorkflow() {
  const { addWorkflow } = useWorkflowActions();
  const { orgId } = useUserInfo();
  const { pop } = useNavigation();
  const { workflows } = useSavedWorkflows();
  const existingFolders = getExistingFolders(workflows);
  const [folderChoice, setFolderChoice] = useState<string>("");
  const [customFolder, setCustomFolder] = useState("");
  const [addToMenuBar, setAddToMenuBar] = useState(true);

  const handleSubmit = async (values: { workflowId: string; customName: string }) => {
    if (!orgId) {
      showFailureToast("Organization ID is missing. Please check your API key.");
      return;
    }

    // Validate workflow ID format
    if (!values.workflowId.startsWith("p_")) {
      showFailureToast("Workflow ID must start with 'p_' (e.g., p_abc123)");
      return;
    }

    try {
      // Fetch workflow details to validate
      const workflowDetails = await fetchWorkflowDetails(values.workflowId, orgId);

      // Determine final folder
      const finalFolder = folderChoice === "__custom__" ? customFolder : folderChoice;

      const newWorkflow: SavedWorkflow = {
        id: values.workflowId,
        customName: values.customName,
        folder: finalFolder,
        url: `https://pipedream.com/@/workflow/${values.workflowId}`,
        triggerCount: workflowDetails.triggers?.length || 0,
        stepCount: workflowDetails.steps?.length || 0,
        showInMenuBar: addToMenuBar,
        sortOrder: 0,
      };

      const existing = await addWorkflow(newWorkflow);

      if (existing) {
        showFailureToast(`"${existing.customName}" is already in your workflow list`);
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

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Connect Workflow" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="workflowId"
        title="Workflow ID"
        placeholder="p_abc123"
        info="Enter the workflow ID from Pipedream. You can find this in the workflow URL or in the workflow settings."
      />
      <Form.TextField
        id="customName"
        title="Custom Name"
        placeholder="My Workflow"
        info="Give this workflow a custom name for display in the extension. This will be used instead of the workflow ID in lists."
      />
      <Form.Dropdown
        id="folder"
        title="Folder"
        value={folderChoice}
        onChange={setFolderChoice}
        info="Optional: Organize workflows into folders for better organization."
      >
        <Form.Dropdown.Item value="" title="None" />
        {existingFolders.map(f => (
          <Form.Dropdown.Item key={f} value={f} title={f} />
        ))}
        <Form.Dropdown.Item value="__custom__" title="Add Folder..." />
      </Form.Dropdown>
      {folderChoice === "__custom__" && (
        <Form.TextField
          id="customFolder"
          title="New Folder"
          value={customFolder}
          onChange={setCustomFolder}
          info="Enter the name for your new folder."
        />
      )}
      <Form.Checkbox id="addToMenuBar" label="Add to Menu Bar" value={addToMenuBar} onChange={setAddToMenuBar} />
    </Form>
  );
}
