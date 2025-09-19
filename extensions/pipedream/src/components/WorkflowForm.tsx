import { Form, ActionPanel, Action } from "@raycast/api";
import { SavedWorkflow } from "../types";
import { getExistingFolders } from "../utils/workflow";
import { useState } from "react";

export interface WorkflowFormValues {
  workflowId: string;
  customName: string;
  folder: string;
  showInMenuBar: boolean;
}

interface WorkflowFormProps {
  workflow?: SavedWorkflow;
  workflows: SavedWorkflow[];
  onSubmit: (values: WorkflowFormValues) => void;
  isConnecting?: boolean;
  itemProps?: {
    workflowId?: Partial<Form.TextField.Props>;
    customName?: Partial<Form.TextField.Props>;
    folder?: Partial<Form.Dropdown.Props>;
    showInMenuBar?: Partial<Form.Checkbox.Props>;
  };
}

export function WorkflowForm({ workflow, workflows, onSubmit, isConnecting = false, itemProps }: WorkflowFormProps) {
  const existingFolders = getExistingFolders(workflows);
  const [folderChoice, setFolderChoice] = useState<string>(workflow?.folder || "");
  const [customFolder, setCustomFolder] = useState("");
  const [addToMenuBar, setAddToMenuBar] = useState(workflow?.showInMenuBar ?? true);

  const handleSubmit = (values: WorkflowFormValues) => {
    const finalFolder = folderChoice === "__custom__" ? customFolder : folderChoice;
    const finalValues = {
      ...values,
      folder: finalFolder,
      showInMenuBar: addToMenuBar,
    };
    onSubmit(finalValues);
  };

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title={isConnecting ? "Connect Workflow" : "Save Changes"} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      {isConnecting && (
        <Form.TextField
          {...(itemProps?.workflowId || {})}
          id="workflowId"
          title="Workflow ID"
          placeholder="p_abc123"
          info="Enter the workflow ID from Pipedream. You can find this in the workflow URL or in the workflow settings."
          defaultValue={workflow?.id}
        />
      )}
      <Form.TextField
        {...(itemProps?.customName || {})}
        id="customName"
        title="Custom Name"
        placeholder="My Workflow"
        info="Give this workflow a custom name for display in the extension. This will be used instead of the workflow ID in lists."
        defaultValue={workflow?.customName}
      />
      <Form.Dropdown
        id="folder"
        title="Folder"
        value={folderChoice}
        onChange={setFolderChoice}
        info="Optional: Organize workflows into folders for better organization."
      >
        <Form.Dropdown.Item value="" title="None" />
        {existingFolders.map((f) => (
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
