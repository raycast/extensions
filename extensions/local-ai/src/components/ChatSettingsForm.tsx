import { Action, ActionPanel, Form, useNavigation } from "@raycast/api";
import { DEFAULT_CHAT_INSTRUCTIONS } from "../lib/chats/transcript";

export function ChatSettingsForm(props: { instructions: string; onSave: (instructions: string) => Promise<boolean> }) {
  const { pop } = useNavigation();

  async function submit(values: { instructions: string }) {
    if (await props.onSave(values.instructions.trim())) pop();
  }

  return (
    <Form
      navigationTitle="Edit Instructions"
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Save Instructions" onSubmit={submit} />
        </ActionPanel>
      }
    >
      <Form.TextArea
        id="instructions"
        title="Instructions"
        defaultValue={props.instructions}
        placeholder={DEFAULT_CHAT_INSTRUCTIONS}
        info="Leave empty to use the default instructions."
      />
    </Form>
  );
}
