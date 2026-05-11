import { Action, ActionPanel, Form, Icon, useNavigation } from "@raycast/api";
import { FormValidation, useForm } from "@raycast/utils";
import { useState } from "react";
import { CreateProject, Project } from "../../types";
import useCoolify from "../../use-coolify";

export default function UpdateProject({ project, onUpdated }: { project: Project; onUpdated: () => void }) {
  const { pop } = useNavigation();
  const [execute, setExecute] = useState(false);

  const { itemProps, handleSubmit, values } = useForm<CreateProject>({
    onSubmit() {
      setExecute(true);
    },
    validation: {
      name: FormValidation.Required,
    },
    initialValues: {
      name: project.name,
      description: project.description || "",
    },
  });

  const { isLoading } = useCoolify(`projects/${project.uuid}`, {
    method: "PATCH",
    body: values,
    execute,
    onData() {
      onUpdated();
      pop();
    },
    onError() {
      setExecute(false);
    },
  });

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm icon={Icon.Check} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Description text="Update Project" />
      <Form.TextField title="Name" placeholder="Your Cooler Project" {...itemProps.name} />
      <Form.TextField
        title="Description"
        placeholder="This is my cooler project everyone knows about"
        {...itemProps.description}
      />
    </Form>
  );
}
