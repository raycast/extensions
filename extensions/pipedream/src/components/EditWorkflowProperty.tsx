import { Form, Action, ActionPanel, useNavigation } from "@raycast/api";
import { useSavedWorkflows } from "../hooks/useSavedWorkflows";
import { getExistingFolders } from "../utils/workflow";
import { useState } from "react";

interface EditWorkflowPropertyProps {
  label: string;
  property: "name" | "folder";
  currentValue: string;

  onSave: (_newValue: string) => Promise<void>;
}

export function EditWorkflowProperty({ label, property, currentValue, onSave }: EditWorkflowPropertyProps) {
  const { pop } = useNavigation();
  const { workflows } = useSavedWorkflows();
  const existingFolders = getExistingFolders(workflows);
  const [folderChoice, setFolderChoice] = useState<string>(
    currentValue && existingFolders.includes(currentValue) ? currentValue : currentValue ? "__custom__" : "",
  );
  const [customFolder, setCustomFolder] = useState(folderChoice === "__custom__" ? currentValue : "");

  const handleSubmit = async (values: { value: string }) => {
    let finalValue = values.value;
    if (property === "folder") {
      finalValue = folderChoice === "__custom__" ? customFolder : folderChoice;
    }
    await onSave(finalValue);
    pop();
  };

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Save" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      {property === "name" ? (
        <Form.TextField id="value" title={label} defaultValue={currentValue} />
      ) : (
        <>
          <Form.Dropdown id="folder" title="Folder" value={folderChoice} onChange={setFolderChoice}>
            <Form.Dropdown.Item value="" title="None" />
            {existingFolders.map((f) => (
              <Form.Dropdown.Item key={f} value={f} title={f} />
            ))}
            <Form.Dropdown.Item value="__custom__" title="Add Folder..." />
          </Form.Dropdown>
          {folderChoice === "__custom__" && (
            <Form.TextField id="customFolder" title="New Folder" value={customFolder} onChange={setCustomFolder} />
          )}
        </>
      )}
    </Form>
  );
}
