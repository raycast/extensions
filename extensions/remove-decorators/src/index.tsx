import { ActionPanel, Icon, Form, Action } from "@raycast/api";
import removeDecorators from "./utils/removeDecorators";

interface FormInput {
  input: string;
}

export default function main() {
  return (
    <Form
      actions={
        <ActionPanel>
          <FormatAction />
        </ActionPanel>
      }
    >
      <Form.TextArea id="input" title="Input" placeholder="Paste your ugly decorators here…" />
    </Form>
  );
}

function FormatAction() {
  async function handleSubmit(values: FormInput) {
    const { input } = values;
    await removeDecorators(input);
  }

  return <Action.SubmitForm icon={Icon.Checkmark} title="Remove decorators" onSubmit={handleSubmit} />;
}
