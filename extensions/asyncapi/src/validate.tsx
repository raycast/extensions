import { ActionPanel, Form, Action, Toast, showToast } from "@raycast/api";
import { validateAsyncAPIDocument, AsyncAPIDocumentExample } from "./utils";

interface ValidateInput {
  document: string;
}

export default function Command() {
  return (
    <Form
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <Validate />
          </ActionPanel.Section>
        </ActionPanel>
      }
    >
      <Form.TextArea id="document" title="YAML/JSON AsyncAPI document" placeholder={AsyncAPIDocumentExample} />
    </Form>
  );
}

function isValid(input: ValidateInput): boolean {
  const { document } = input;

  if (document.length === 0) {
    showToast(Toast.Style.Failure, "You must provide an AsyncAPI document");
    return false;
  }

  return true;
}

function Validate() {
  async function validateDocument(input: ValidateInput) {
    if (!isValid(input)) {
      return;
    }

    await showToast(Toast.Style.Animated, "Validating your AsyncAPI document...");

    const { document } = input;
    await validateAsyncAPIDocument(document);
  }

  return <Action.SubmitForm title="Validate" onSubmit={(input: ValidateInput) => validateDocument(input)} />;
}
