import { Action, ActionPanel, Form, Icon, useNavigation } from "@raycast/api";
import { FormValidation, useForm } from "@raycast/utils";
import { useState } from "react";
import { type CreateProject } from "../../types";
import useCoolify from "../../use-coolify";

export default function CreateProject({ onAdded }: { onAdded: () => void }) {
  const { pop } = useNavigation();
  const [execute, setExecute] = useState(false);

  const { itemProps, handleSubmit, values } = useForm<CreateProject>({
    onSubmit() {
      setExecute(true);
    },
    validation: {
      name: FormValidation.Required,
    },
  });

  const { isLoading } = useCoolify("projects", {
    method: "POST",
    body: values,
    execute,
    onData() {
      onAdded();
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
      <Form.Description text="Create Project" />
      <Form.TextField title="Name" placeholder="Your Cool Project" {...itemProps.name} />
      <Form.TextField
        title="Description"
        placeholder="This is my cool project everyone knows about"
        {...itemProps.description}
      />
      <Form.Description text="New project will have a default production environment." />
    </Form>
  );
}
