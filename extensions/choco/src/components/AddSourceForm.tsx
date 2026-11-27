import { Action, ActionPanel, Form, Icon, useNavigation } from "@raycast/api";
import { FormValidation, useForm } from "@raycast/utils";
import { addSource } from "../choco/cli";
import { runPackageTask } from "./PackageActions";

interface AddSourceFormProps {
  onSuccess: () => void;
}

interface AddSourceValues {
  name: string;
  url: string;
  priority: string;
}

export function AddSourceForm({ onSuccess }: AddSourceFormProps) {
  const { pop } = useNavigation();

  const { handleSubmit, itemProps } = useForm<AddSourceValues>({
    initialValues: {
      priority: "0",
    },
    validation: {
      name: FormValidation.Required,
      url: FormValidation.Required,
    },
    async onSubmit(values) {
      const name = values.name.trim();
      const url = values.url.trim();
      const priorityRaw = values.priority.trim();
      const parsedPriority = priorityRaw
        ? Number.parseInt(priorityRaw, 10)
        : undefined;

      const status = await runPackageTask({
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

      if (status === "completed") {
        onSuccess();
        pop();
      } else if (status === "launched") {
        pop();
      }
    },
  });

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
        title="Source Name"
        placeholder="e.g. internal-feed"
        {...itemProps.name}
      />
      <Form.TextField
        title="Source URL"
        placeholder="https://packages.example.com/nuget"
        {...itemProps.url}
      />
      <Form.TextField
        title="Priority"
        placeholder="0 (lower runs first)"
        {...itemProps.priority}
      />
    </Form>
  );
}
