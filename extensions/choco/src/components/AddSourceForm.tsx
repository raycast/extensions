import { Action, ActionPanel, Form, Icon, useNavigation } from "@raycast/api";
import { useState } from "react";
import { addSource } from "../choco/cli";
import { runPackageTask } from "./PackageActions";

interface AddSourceFormProps {
  onSuccess: () => void;
}

export function AddSourceForm({ onSuccess }: AddSourceFormProps) {
  const { pop } = useNavigation();
  const [nameError, setNameError] = useState<string | undefined>();
  const [urlError, setUrlError] = useState<string | undefined>();

  async function handleSubmit(values: {
    name: string;
    url: string;
    priority: string;
  }) {
    const name = values.name.trim();
    const url = values.url.trim();
    const priorityRaw = values.priority.trim();

    if (!name) {
      setNameError("Source name is required");
      return;
    }
    if (!url) {
      setUrlError("Source URL or folder path is required");
      return;
    }

    const parsedPriority = priorityRaw
      ? Number.parseInt(priorityRaw, 10)
      : undefined;
    const ok = await runPackageTask({
      loadingTitle: `Adding source "${name}"...`,
      successTitle: `Added source "${name}"`,
      errorTitle: `Failed to add source "${name}"`,
      task: () =>
        addSource({
          name,
          url,
          priority:
            parsedPriority !== undefined && Number.isFinite(parsedPriority)
              ? parsedPriority
              : undefined,
        }),
    });

    if (ok) {
      onSuccess();
      pop();
    }
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Add Source"
            icon={Icon.Plus}
            onSubmit={handleSubmit}
          />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="name"
        title="Source Name"
        placeholder="e.g. internal-feed"
        error={nameError}
        onChange={() => nameError && setNameError(undefined)}
      />
      <Form.TextField
        id="url"
        title="Source URL"
        placeholder="https://packages.example.com/nuget"
        error={urlError}
        onChange={() => urlError && setUrlError(undefined)}
      />
      <Form.TextField
        id="priority"
        title="Priority"
        placeholder="0 (lower runs first)"
        defaultValue="0"
      />
    </Form>
  );
}
