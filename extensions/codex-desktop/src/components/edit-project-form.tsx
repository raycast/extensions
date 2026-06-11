import { Action, ActionPanel, Form, Icon, useNavigation } from "@raycast/api";
import path from "node:path";
import { useState } from "react";
import { type Project } from "../lib/project-store";

const projectColorOptions = [
  "pink",
  "teal",
  "orange",
  "purple",
  "blue",
  "lime",
];

/* eslint-disable no-unused-vars */
type EditProjectFormProps = {
  item: Project;
  onSave: (...args: [Project, EditProjectFormValues]) => Promise<boolean>;
};
/* eslint-enable no-unused-vars */

export type EditProjectFormValues = {
  name: string;
  iconColor: string;
  startupCommand: string;
  file?: string[];
};

export function EditProjectForm({ item, onSave }: EditProjectFormProps) {
  const { pop } = useNavigation();
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(values: EditProjectFormValues) {
    setIsSubmitting(true);
    try {
      const saved = await onSave(item, values);
      if (saved) pop();
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Form
      navigationTitle="Edit Project"
      isLoading={isSubmitting}
      actions={
        <ActionPanel>
          <Action.SubmitForm<EditProjectFormValues>
            title="Save Project"
            icon={Icon.Check}
            onSubmit={handleSubmit}
          />
        </ActionPanel>
      }
    >
      <Form.Description
        text={`Update the Codex settings for ${item.worktree}.`}
      />
      <Form.TextField
        id="name"
        title="Project Name"
        defaultValue={item.name ?? ""}
        placeholder={path.basename(item.worktree)}
      />
      <Form.FilePicker
        id="file"
        title={item.hasIcon ? "Replace Icon" : "Add Icon"}
        allowMultipleSelection={false}
        info="Optional. Choose a PNG, JPG, JPEG, SVG, GIF, WEBP, or ICO file."
      />
      <Form.Dropdown
        id="iconColor"
        title="Color"
        defaultValue={item.iconColor ?? ""}
      >
        <Form.Dropdown.Item value="" title="None" />
        {projectColorOptions.map((color) => (
          <Form.Dropdown.Item
            key={color}
            value={color}
            title={color[0].toUpperCase() + color.slice(1)}
          />
        ))}
      </Form.Dropdown>
      <Form.TextArea
        id="startupCommand"
        title="Workspace Startup Script"
        defaultValue={item.startupCommand ?? ""}
        placeholder="e.g. bun install"
        info="Runs after creating a new workspace (worktree). Leave blank to clear it."
      />
    </Form>
  );
}
