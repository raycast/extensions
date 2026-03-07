import { Form, ActionPanel, Action, useNavigation } from "@raycast/api";
import { Task } from "../models/types";

interface TagsFormProps {
  task: Task;
  onUpdate: (tags: string) => Promise<void>;
  onSuccess?: () => Promise<void>;
}

export default function TagsForm({ task, onUpdate, onSuccess }: TagsFormProps) {
  const { pop } = useNavigation();

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Set Tags"
            onSubmit={async ({ tags }) => {
              await onUpdate(tags as string);
              if (onSuccess) {
                await onSuccess();
              }
              pop();
            }}
          />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="tags"
        title="Tags"
        placeholder="Comma-separated tags (e.g. email, urgent)"
        defaultValue={task.tags.join(", ")}
      />
    </Form>
  );
}
