import { Form, ActionPanel, Action, useNavigation, Icon } from "@raycast/api";
import { Project, Color } from "../types";
import { addProject, updateProject } from "../utils/storage";
import { FormValidation, showFailureToast, useForm } from "@raycast/utils";

interface ProjectFormProps {
  project?: Project;
  onSave?: () => void;
}

// List of predefined colors
const COLORS = [
  { value: "#FF3B30", label: "Red" },
  { value: "#FF9500", label: "Orange" },
  { value: "#FFCC00", label: "Yellow" },
  { value: "#34C759", label: "Green" },
  { value: "#007AFF", label: "Blue" },
  { value: "#AF52DE", label: "Purple" },
  { value: "#FF2D55", label: "Pink" },
  { value: "#8E8E93", label: "Gray" },
] as const;

interface FormValues {
  title: string;
  subtitle?: string;
  color?: Color;
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
      color: project?.color ?? "#8E8E93",
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
      <Form.Dropdown
        id="color"
        title="Color"
        value={itemProps.color.value}
        onChange={(value) => itemProps.color.onChange?.(value as Color)}
      >
        <Form.Dropdown.Item value="gray" title="Default Color" />
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
