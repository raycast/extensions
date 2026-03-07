import { Form, ActionPanel, Action, useNavigation } from "@raycast/api";
import { Task } from "../models/types";

interface ContextFormProps {
  task: Task;
  onUpdate: (contexts: string) => Promise<void>;
  onSuccess?: () => Promise<void>;
}

export default function ContextForm({ task, onUpdate, onSuccess }: ContextFormProps) {
  const { pop } = useNavigation();

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Set Context"
            onSubmit={async ({ contexts }) => {
              await onUpdate(contexts as string);
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
        id="contexts"
        title="Contexts"
        placeholder="Comma-separated contexts (e.g. home, office)"
        defaultValue={task.contexts.join(", ")}
      />
    </Form>
  );
}
