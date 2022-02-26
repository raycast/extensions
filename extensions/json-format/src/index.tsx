import {
  copyTextToClipboard,
  popToRoot,
  showHUD,
  showToast,
  ActionPanel,
  Icon,
  SubmitFormAction,
  Form,
  ToastStyle,
} from "@raycast/api";

type IndentType = "tab" | "2" | "4" | "8";

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
      showToast(ToastStyle.Failure, "Empty input");
      return;
    }
    const space = indent === "tab" ? "\t" : parseInt(indent);
    let json;
    try {
      json = JSON.parse(input);
    } catch (e) {
      showToast(ToastStyle.Failure, "Invalid JSON");
      return;
    }
    const output = JSON.stringify(json, null, space);
    copyTextToClipboard(output);
    showHUD("Copied to clipboard");
    popToRoot();
  }

  return <SubmitFormAction icon={Icon.Checkmark} title="Format" onSubmit={handleSubmit} />;
}
