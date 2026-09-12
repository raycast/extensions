import { popToRoot, showHUD, showToast, ActionPanel, Icon, Form, Action, Clipboard, Toast } from "@raycast/api";

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

    const output = removeDuplicateLines(input);
    Clipboard.copy(output);
    showHUD("Copied to clipboard");
    popToRoot();
  }

  return <Action.SubmitForm icon={Icon.Checkmark} title="De-duplicate" onSubmit={handleSubmit} />;
}

function removeDuplicateLines(originalText: string) {
  const lines = originalText.split("\n");

  const linesAfterRemoveDuplicate: Set<string> = new Set();
  lines.forEach((line) => {
    linesAfterRemoveDuplicate.add(line.trim());
  });

  const result = buildStr(linesAfterRemoveDuplicate);
  return result;
}

function buildStr(lines: Set<string>) {
  let result = "";
  lines.forEach((e) => {
    if (e.length > 0) {
      result += e + "\n";
    }
  });
  return result;
}
