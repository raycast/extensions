import {
  ActionPanel,
  Action,
  Form,
  showToast,
  Toast,
  open,
  useNavigation,
} from "@raycast/api";
import { useState } from "react";
import { createRepo } from "./lib/api";

interface FormValues {
  name: string;
  description: string;
  isPrivate: boolean;
}

function validateName(name: string): string | undefined {
  if (!name.trim()) return "Name is required";
  if (!/^[a-zA-Z0-9._-]+$/.test(name))
    return "Only letters, numbers, ., - and _ are allowed";
  return undefined;
}

export function CreateRepoForm({ onCreated }: { onCreated: () => void }) {
  const { pop } = useNavigation();
  const [isLoading, setIsLoading] = useState(false);
  const [nameError, setNameError] = useState<string | undefined>();

  async function handleSubmit(values: FormValues) {
    const err = validateName(values.name);
    if (err) {
      setNameError(err);
      return;
    }

    setIsLoading(true);
    try {
      const repo = await createRepo(values.name.trim(), {
        private: values.isPrivate,
        description: values.description.trim(),
      });
      await showToast({
        style: Toast.Style.Success,
        title: `${repo.name} created`,
        primaryAction: {
          title: "Open in Browser",
          onAction: () => open(repo.html_url),
        },
      });
      onCreated();
      pop();
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to create repository",
        message,
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Form
      isLoading={isLoading}
      navigationTitle="Create Repository"
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Create Repository"
            onSubmit={handleSubmit}
          />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="name"
        title="Name"
        placeholder="my-new-repo"
        autoFocus
        error={nameError}
        onChange={() => setNameError(undefined)}
      />
      <Form.TextField
        id="description"
        title="Description"
        placeholder="Optional"
      />
      <Form.Checkbox id="isPrivate" label="Private" defaultValue={true} />
    </Form>
  );
}
