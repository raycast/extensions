import { Action, ActionPanel, Form, Icon, Toast, useNavigation } from "@raycast/api";
import { FormValidation, useForm } from "@raycast/utils";
import { createPreferenceClient, getTanaPreferences } from "../api/preferenceClient";
import { createTag } from "../api/tanaService";

type CreatedTag = { id: string; name: string };

type Values = {
  name: string;
  description?: string;
  showCheckbox: boolean;
};

type SuperTagCreateFormProps = {
  workspaceId?: string;
  onCreate?: (tag: CreatedTag) => void;
};

export function SupertagCreateForm({ workspaceId, onCreate }: SuperTagCreateFormProps) {
  const { pop } = useNavigation();
  const resolvedWorkspaceId = workspaceId || getTanaPreferences().workspaceId?.trim() || "";
  const { handleSubmit, itemProps } = useForm<Values>({
    async onSubmit(values) {
      const toast = new Toast({ style: Toast.Style.Animated, title: "Creating Supertag" });
      await toast.show();
      try {
        const result = await createTag(createPreferenceClient(resolvedWorkspaceId), resolvedWorkspaceId, values);
        onCreate?.({ id: result.tagId, name: result.tagName });
        toast.style = Toast.Style.Success;
        toast.message = `${result.tagName} created`;
        pop();
      } catch (error) {
        toast.style = Toast.Style.Failure;
        toast.message = error instanceof Error ? error.message : "Unknown error";
      }
    },
    validation: { name: FormValidation.Required },
    initialValues: { name: "", description: "", showCheckbox: false },
  });

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Create Supertag" onSubmit={handleSubmit} icon={Icon.Plus} />
        </ActionPanel>
      }
    >
      <Form.TextField title="Name" placeholder="Project" {...itemProps.name} />
      <Form.TextArea title="Description" placeholder="Optional description" {...itemProps.description} />
      <Form.Checkbox label="Show checkbox on tagged nodes" {...itemProps.showCheckbox} />
      {!resolvedWorkspaceId && (
        <Form.Description title="Workspace" text="Select a workspace before creating a Supertag." />
      )}
    </Form>
  );
}

export function CreateSupertagAction({ shortcut = true, ...props }: SuperTagCreateFormProps & { shortcut?: boolean }) {
  return (
    <Action.Push
      title="Create Supertag"
      target={<SupertagCreateForm {...props} />}
      icon={Icon.Plus}
      shortcut={shortcut ? { modifiers: ["cmd"], key: "n" } : undefined}
    />
  );
}
