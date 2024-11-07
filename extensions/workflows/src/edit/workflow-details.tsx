// edit/workflow-details.tsx
import { Action, ActionPanel, Form, Icon, showToast, Toast, useNavigation } from "@raycast/api";
import { useState } from "react";
import { WorkflowDefinition } from "../workflow-definition";

export default function EditWorkflowDetails({
  workflow,
  onSubmit,
}: {
  workflow: WorkflowDefinition;
  onSubmit: (updatedWorkflow: WorkflowDefinition) => Promise<void>;
}) {
  const [title, setTitle] = useState(workflow.title);
  const [description, setDescription] = useState(workflow.description);
  const [icon, setIcon] = useState(workflow.icon);
  const { pop } = useNavigation();

  async function handleSubmit() {
    if (!title.trim()) {
      showToast({
        style: Toast.Style.Failure,
        title: "Invalid Input",
        message: "Title cannot be empty",
      });
      return;
    }

    const updatedWorkflow: WorkflowDefinition = {
      ...workflow,
      title: title.trim(),
      description: description.trim(),
      icon: icon, // fallback icon if empty
    };

    try {
      await onSubmit(updatedWorkflow);
      pop();
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to update workflow",
        message: String(error),
      });
    }
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Save" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="title"
        title="Title"
        placeholder="Enter workflow title"
        value={title}
        onChange={setTitle}
        autoFocus
      />
      <Form.TextField
        id="description"
        title="Description"
        placeholder="Enter workflow description"
        value={description}
        onChange={setDescription}
      />
      <Form.Dropdown
        id="icon"
        title="Icon"
        value={icon}
        onChange={(v) => {
          setIcon(v);
        }}
      >
        {Object.entries(Icon).map(([k, v]) => (
          <Form.Dropdown.Item key={k} value={v} title={k} icon={v} />
        ))}
      </Form.Dropdown>
    </Form>
  );
}
