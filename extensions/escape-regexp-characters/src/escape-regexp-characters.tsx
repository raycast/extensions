import { popToRoot, showHUD, showToast, ActionPanel, Icon, Form, Action, Clipboard, Toast } from "@raycast/api";

import escapeStringRegexp from "escape-string-regexp";

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
      <Form.TextArea id="input" title="Input" placeholder="Paste Text here…" />
    </Form>
  );
}

function FormatAction() {
  async function handleSubmit(values: FormInput) {
    const { input } = values;
    if (input.length === 0) {
      showToast({
        style: Toast.Style.Failure,
        title: "Empty input",
      });
      return;
    }

    const output = escapeString(input);
    Clipboard.copy(output);
    showHUD("Copied to clipboard");
    popToRoot();
  }

  return <Action.SubmitForm icon={Icon.Checkmark} title="Escape Special Characters" onSubmit={handleSubmit} />;
}

function escapeString(originalText: string) {
  const result = escapeStringRegexp(originalText);
  return result;
}
