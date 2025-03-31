import { Action, ActionPanel, Form, showToast, Toast } from "@raycast/api";
import { useForm } from "@raycast/utils";
import { useSystemPrompt } from "./hooks/use-system-prompt";

export default function Command() {
  const { value: systemPrompt, setValue: setSystemPrompt, isLoading } = useSystemPrompt();
  const { handleSubmit } = useForm<{ systemPrompt: string }>({
    onSubmit(values) {
      setSystemPrompt(values.systemPrompt);
      showToast({
        style: Toast.Style.Success,
        title: "System Prompt Saved",
      });
    },
  });

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Save System Prompt" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      {!isLoading && (
        <Form.TextArea
          id="systemPrompt"
          defaultValue={systemPrompt}
          title="System Prompt"
          placeholder="Set the system prompt for your upcoming conversations"
        />
      )}
    </Form>
  );
}
