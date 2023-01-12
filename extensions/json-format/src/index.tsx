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

type IndentType = 'tab' | '2' | '4' | '8';

interface FormInput {
  input: string;
  indent: IndentType;
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
      <Form.Dropdown id="indent" title="Indentation" storeValue>
        <Form.Dropdown.Item value="tab" title="Tabs" />
        <Form.Dropdown.Item value="2" title="Spaces: 2" />
        <Form.Dropdown.Item value="4" title="Spaces: 4" />
        <Form.Dropdown.Item value="8" title="Spaces: 8" />
      </Form.Dropdown>
    </Form>
  );
}

function FormatAction() {
  async function handleSubmit(values: FormInput) {
    const { indent, input } = values;
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
