import { Action, ActionPanel, Form, Toast, showToast, useNavigation } from "@raycast/api";
import { useForm } from "@raycast/utils";
import { getQuickShellStorage } from "../lib/raycast-storage";
import { showStorageFailure } from "../lib/failure-feedback";

type Props = {
  beforeWorkspaceId?: string;
  onSaved?: () => Promise<void>;
};

export default function AddSeparatorForm({ beforeWorkspaceId, onSaved }: Props) {
  const { pop } = useNavigation();
  const storage = getQuickShellStorage();

  const { handleSubmit, itemProps } = useForm<{ title: string }>({
    async onSubmit(values) {
      try {
        const title = values.title.trim() || null;
        await storage.insertSeparator(title, beforeWorkspaceId);
        await showToast({
          style: Toast.Style.Success,
          title: "Section separator added",
          message: title ?? "Workspaces",
        });
        await onSaved?.();
        pop();
      } catch (error) {
        await showStorageFailure("Add separator", error);
      }
    },
  });

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Add Section Separator" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Description text="Separators group workspaces in browse mode (search ignores them)." />
      <Form.TextField title="Title" placeholder="Workspaces" {...itemProps.title} />
    </Form>
  );
}
