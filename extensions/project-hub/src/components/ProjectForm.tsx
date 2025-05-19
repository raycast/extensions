import { Form, ActionPanel, Action, useNavigation, Icon } from "@raycast/api";
import { Project } from "../types";
import { addProject, updateProject } from "../utils/storage";
import { FormValidation, showFailureToast, useForm } from "@raycast/utils";

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

interface FormValues {
  title: string;
  subtitle?: string;
  color?: string;
}

export function ProjectForm({ project, onSave }: ProjectFormProps) {
  const { pop } = useNavigation();

  const { handleSubmit, itemProps } = useForm<FormValues>({
    onSubmit: async (values) => {
      try {
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
      } catch (error) {
        showFailureToast(error, { title: "Failed to save project" });
      }
    },
    validation: {
      title: FormValidation.Required,
    },
    initialValues: {
      title: project?.title ?? "",
      subtitle: project?.subtitle ?? "",
      color: project?.color ?? "",
    },
  });

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Save Project" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField {...itemProps.title} title="Title" placeholder="Enter project title" autoFocus />
      <Form.TextField
        {...itemProps.subtitle}
        title="Subtitle"
        placeholder="Enter project subtitle (optional)"
        info="A brief description or category for your project"
      />
      <Form.Dropdown {...itemProps.color} title="Color">
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
