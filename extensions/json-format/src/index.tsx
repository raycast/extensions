import { popToRoot, ActionPanel, Icon, Form, Action } from '@raycast/api';

import { formatJS } from './utils';

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
      <Form.TextArea id="input" title="Input" placeholder="Paste JSON here…" />
    </Form>
  );
}

function FormatAction() {
  async function handleSubmit(values: FormInput) {
    const { input } = values;
    await formatJS(input);
  }

  return (
    <Action.SubmitForm
      icon={Icon.Checkmark}
      title="Format"
      onSubmit={handleSubmit}
    />
  );
}
