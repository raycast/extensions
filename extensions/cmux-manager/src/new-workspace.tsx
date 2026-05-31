import { Action, ActionPanel, Form, Icon, showToast, Toast, popToRoot } from "@raycast/api";
import { useState } from "react";
import { newWorkspace } from "./cmux";

interface FormValues {
  name: string;
  cwd: string;
}

export default function Command() {
  const [nameError, setNameError] = useState<string | undefined>();

  async function handleSubmit(values: FormValues) {
    if (!values.name || values.name.trim().length === 0) {
      setNameError("Name is required");
      return;
    }
    const toast = await showToast({ style: Toast.Style.Animated, title: "Creating workspace…" });
    try {
      await newWorkspace({ name: values.name.trim(), cwd: values.cwd });
      toast.style = Toast.Style.Success;
      toast.title = `Created "${values.name.trim()}"`;
      await popToRoot();
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Failed to create workspace";
      toast.message = error instanceof Error ? error.message : String(error);
    }
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Create Workspace" icon={Icon.Plus} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="name"
        title="Name"
        placeholder="e.g. infra"
        autoFocus
        error={nameError}
        onChange={() => nameError && setNameError(undefined)}
        onBlur={(event) => {
          if (!event.target.value || event.target.value.trim().length === 0) {
            setNameError("Name is required");
          }
        }}
      />
      <Form.TextField
        id="cwd"
        title="Working Directory"
        placeholder="Optional — defaults to cmux default"
      />
      <Form.Description text="Creates a new cmux workspace and focuses it." />
    </Form>
  );
}
