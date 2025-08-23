import { Action, ActionPanel, Color, Form, Icon, Toast, popToRoot, showToast } from "@raycast/api";
import { useState } from "react";
import { makeAuthenticatedRequest } from "./lib/auth";
import { CreateProjectInput } from "./types";

interface CreateProjectProps {
  onProjectCreated?: () => void;
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

export default function CreateProject({ onProjectCreated }: CreateProjectProps) {
  const [name, setName] = useState("");
  const [color, setColor] = useState(Color.Blue);
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
      const projectData: CreateProjectInput = {
        name: name.trim(),
        color,
      };

      const response = await makeAuthenticatedRequest("/projects", {
        method: "POST",
        body: JSON.stringify(projectData),
      });

      if (response.ok) {
        await showToast({
          style: Toast.Style.Success,
          title: "Success",
          message: "Project created successfully",
        });

        if (onProjectCreated) {
          onProjectCreated();
        }

        await popToRoot();
      } else {
        throw new Error("Failed to create project");
      }
    } catch {
      await showToast({
        style: Toast.Style.Failure,
        title: "Error",
        message: "Failed to create project",
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
          <Action.SubmitForm title="Create Project" icon={Icon.Plus} onSubmit={handleSubmit} />
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
