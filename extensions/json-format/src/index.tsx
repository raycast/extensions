import {
  popToRoot,
  showHUD,
  showToast,
  ActionPanel,
  Icon,
  Form,
  Action,
  Clipboard,
  Toast,
} from '@raycast/api';

import { getIndentation } from './utils';

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
    const indent = getIndentation();
    const { input } = values;
    if (input.length === 0) {
      showToast({
        style: Toast.Style.Failure,
        title: 'Empty input',
      });
      return;
    }
    const space = indent === 'tab' ? '\t' : parseInt(indent);
    let json;
    try {
      json = JSON.parse(input);
    } catch (e) {
      showToast({
        style: Toast.Style.Failure,
        title: 'Invalid JSON',
      });
      return;
    }
    const output = JSON.stringify(json, null, space);
    Clipboard.copy(output);
    showHUD('Copied to clipboard');
    popToRoot();
  }

  return (
    <Action.SubmitForm
      icon={Icon.Checkmark}
      title="Format"
      onSubmit={handleSubmit}
    />
  );
}
