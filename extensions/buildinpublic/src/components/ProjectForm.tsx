import { Action, ActionPanel, Form, Icon, Toast, showToast, useNavigation } from "@raycast/api";
import { useForm } from "@raycast/utils";
import { APIError, createProject, updateProject } from "../api";
import { OwnProject, Project, ProjectInput } from "../types";
import { VerificationDetail } from "./VerificationDetail";

interface Values {
  name: string;
  url: string;
  pitch: string;
}

const FIELDS = ["name", "url", "pitch"] as const;

export function ProjectForm({ project, onSave }: { project?: Project; onSave?: (project: OwnProject) => void }) {
  const { push, pop } = useNavigation();

  const { handleSubmit, itemProps, setValidationError } = useForm<Values>({
    initialValues: { name: project?.name ?? "", url: project?.url ?? "", pitch: project?.pitch ?? "" },
    validation: {
      name: (value) => (!value?.trim() ? "Required" : value.length > 60 ? "60 characters at most" : undefined),
      url: (value) => (!value?.trim() ? "Required" : value.length > 200 ? "200 characters at most" : undefined),
      pitch: (value) => (value && value.length > 160 ? "160 characters at most" : undefined),
    },
    async onSubmit(values) {
      const input = project ? changes(project, values) : { ...values, pitch: values.pitch || null };
      if (Object.keys(input).length === 0) return pop();

      const toast = await showToast({ style: Toast.Style.Animated, title: project ? "Saving…" : "Adding project…" });
      try {
        const saved = project ? await updateProject(project.id, input) : await createProject(input);
        toast.style = Toast.Style.Success;
        toast.title = project ? "Project saved" : "Project added";
        onSave?.(saved);

        if (project) pop();
        if (saved.verification || !project) push(<VerificationDetail project={saved} />);
      } catch (error) {
        toast.style = Toast.Style.Failure;
        toast.title = project ? "Couldn't save project" : "Couldn't add project";
        toast.message = error instanceof Error ? error.message : String(error);

        if (error instanceof APIError) {
          for (const field of FIELDS) {
            if (error.fields[field]) setValidationError(field, error.fields[field].join(", "));
          }
        }
      }
    },
  });

  return (
    <Form
      navigationTitle={project ? `Edit ${project.name}` : "Add Project"}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title={project ? "Save Project" : "Add Project"}
            icon={project ? Icon.Check : Icon.Plus}
            onSubmit={handleSubmit}
          />
        </ActionPanel>
      }
    >
      <Form.TextField title="Name" placeholder="Room AI" {...itemProps.name} />
      <Form.TextField
        title="Website"
        placeholder="roomai.com"
        info="Your project's site. We check it for a tag or DNS record that names you, to verify the project is yours."
        {...itemProps.url}
      />
      <Form.TextArea title="Pitch" placeholder="One line on what it does (optional)" {...itemProps.pitch} />
    </Form>
  );
}

function changes(project: Project, values: Values): ProjectInput {
  const input: ProjectInput = {};
  if (values.name !== project.name) input.name = values.name;
  if (values.url !== project.url) input.url = values.url;
  if (values.pitch !== (project.pitch ?? "")) input.pitch = values.pitch || null;
  return input;
}
