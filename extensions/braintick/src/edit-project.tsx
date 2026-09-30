import { Action, ActionPanel, Color, Form, Icon, Toast, popToRoot, showToast } from "@raycast/api";
import { useState } from "react";
import { makeAuthenticatedRequest } from "./lib/auth";
import { Project, UpdateProjectInput } from "./types";

interface EditProjectProps {
  project: Project;
  onProjectUpdated?: () => void;
}

const colorOptions = [
  { title: "Red", value: Color.Red },
  { title: "Orange", value: Color.Orange },
  { title: "Yellow", value: Color.Yellow },
  { title: "Green", value: Color.Green },
  { title: "Blue", value: Color.Blue },
  { title: "Purple", value: Color.Purple },
  { title: "Magenta", value: Color.Magenta },
  { title: "PrimaryText", value: Color.PrimaryText },
];

export default function EditProject({ project, onProjectUpdated }: EditProjectProps) {
  const [name, setName] = useState(project.name);
  const [color, setColor] = useState(project.color as Color);
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit() {
    if (!name.trim()) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Error",
        message: "Project name is required",
      });
      return;
    }

    setIsLoading(true);

    try {
      const updates: UpdateProjectInput = {};

      if (name.trim() !== project.name) {
        updates.name = name.trim();
      }

      if (color !== project.color) {
        updates.color = color;
      }

      if (Object.keys(updates).length === 0) {
        await showToast({
          style: Toast.Style.Success,
          title: "No Changes",
          message: "No changes were made",
        });
        await popToRoot();
        return;
      }

      const response = await makeAuthenticatedRequest(`/projects/${project.id}`, {
        method: "PUT",
        body: JSON.stringify(updates),
      });

      if (response.ok) {
        await showToast({
          style: Toast.Style.Success,
          title: "Success",
          message: "Project updated successfully",
        });

        if (onProjectUpdated) {
          onProjectUpdated();
        }

        await popToRoot();
      } else {
        throw new Error("Failed to update project");
      }
    } catch {
      await showToast({
        style: Toast.Style.Failure,
        title: "Error",
        message: "Failed to update project",
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Update Project" icon={Icon.Check} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField id="name" title="Project Name" placeholder="Enter project name" value={name} onChange={setName} />
      <Form.Dropdown id="color" title="Project Color" value={color} onChange={(value) => setColor(value as Color)}>
        {colorOptions.map((option) => (
          <Form.Dropdown.Item
            key={option.value}
            value={option.value}
            title={option.title}
            icon={{ source: Icon.Circle, tintColor: option.value }}
          />
        ))}
      </Form.Dropdown>
    </Form>
  );
}
