import { Form, ActionPanel, Action, useNavigation, Icon } from "@raycast/api";
import { Project } from "../types";
import { addProject, updateProject } from "../utils/storage";

interface ProjectFormProps {
  project?: Project;
  onSave?: () => void;
}

// List of predefined colors
const COLORS = [
  { value: "#FF6B6B", label: "Red" },
  { value: "#4ECDC4", label: "Teal" },
  { value: "#45B7D1", label: "Blue" },
  { value: "#96CEB4", label: "Green" },
  { value: "#FFEEAD", label: "Yellow" },
  { value: "#D4A5A5", label: "Pink" },
  { value: "#9370DB", label: "Purple" },
  { value: "#FF9F1C", label: "Orange" },
] as const;

export function ProjectForm({ project, onSave }: ProjectFormProps) {
  const { pop } = useNavigation();

  async function handleSubmit(values: { title: string; subtitle?: string; color?: string }) {
    if (project) {
      await updateProject({
        ...project,
        title: values.title,
        subtitle: values.subtitle,
        color: values.color,
      });
    } else {
      await addProject({
        title: values.title,
        subtitle: values.subtitle,
        color: values.color,
      });
    }
    onSave?.();
    pop();
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Save Project" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="title"
        title="Title"
        placeholder="Enter project title"
        defaultValue={project?.title}
        autoFocus
      />
      <Form.TextField
        id="subtitle"
        title="Subtitle"
        placeholder="Enter project subtitle (optional)"
        defaultValue={project?.subtitle}
        info="A brief description or category for your project"
      />
      <Form.Dropdown id="color" title="Color" defaultValue={project?.color}>
        <Form.Dropdown.Item value="" title="Default Color" />
        {COLORS.map((color) => (
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
