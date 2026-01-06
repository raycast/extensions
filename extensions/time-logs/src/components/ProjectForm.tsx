import { useState } from "react";
import { Action, ActionPanel, Color, Form, Icon, showToast, Toast, useNavigation } from "@raycast/api";
import { Project } from "../models";
import { saveProject } from "../storage";
import { generateId } from "../utils";

export function ProjectForm({ project, onSave }: { project?: Project; onSave: () => Promise<void> }) {
  const [nameError, setNameError] = useState<string | undefined>();
  const [projectName, setProjectName] = useState<string>(project?.name || "");
  const [selectedColor, setSelectedColor] = useState<string>(project?.color || Color.Blue);
  const { pop } = useNavigation();

  const predefinedColors = [
    { label: "Red", value: Color.Red },
    { label: "Orange", value: Color.Orange },
    { label: "Yellow", value: Color.Yellow },
    { label: "Green", value: Color.Green },
    { label: "Blue", value: Color.Blue },
    { label: "Purple", value: Color.Purple },
    { label: "Magenta", value: Color.Magenta },
  ];

  async function handleSubmit() {
    // Validation
    if (!projectName || projectName.trim() === "") {
      setNameError("Project name is required");
      return;
    }

    try {
      const newProject: Project = {
        id: project?.id || generateId(),
        name: projectName.trim(),
        color: selectedColor,
        createdAt: project?.createdAt || new Date().toISOString(),
      };

      await saveProject(newProject);

      showToast({
        style: Toast.Style.Success,
        title: project ? "Project Updated" : "Project Created",
      });

      await onSave();
      pop();
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to save project",
        message: String(error),
      });
    }
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action title="Save Project" icon={Icon.Check} onAction={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="name"
        title="Name"
        placeholder="Enter project name"
        value={projectName}
        onChange={(value) => {
          setProjectName(value);
          if (value && value.trim() !== "") {
            setNameError(undefined);
          }
        }}
        error={nameError}
        autoFocus={true}
      />

      <Form.Dropdown id="color" title="Color" value={selectedColor} onChange={setSelectedColor} storeValue={true}>
        {predefinedColors.map((color) => (
          <Form.Dropdown.Item
            key={color.value}
            value={color.value}
            title={color.label}
            icon={{ source: Icon.Circle, tintColor: color.value }}
          />
        ))}
      </Form.Dropdown>
    </Form>
  );
}
