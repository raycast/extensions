import { ActionPanel, Form, Action, Toast, showToast } from "@raycast/api";
import { openStudio, AsyncAPIDocumentExample } from "./utils";

interface OpenInStudioInput {
  document: string;
}

export default function Command() {
  return (
    <Form
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <OpenInStudio />
          </ActionPanel.Section>
        </ActionPanel>
      }
    >
      <Form.TextArea id="document" title="YAML/JSON AsyncAPI document" placeholder={AsyncAPIDocumentExample} />
    </Form>
  );
}

function isValid(input: OpenInStudioInput): boolean {
  const { document } = input;
  if (document.length === 0) {
    showToast(Toast.Style.Failure, "You must provide an AsyncAPI document");
    return false;
  }

  return true;
}

function OpenInStudio() {
  async function openInStudio(input: OpenInStudioInput) {
    if (!isValid(input)) {
      return;
    }

    const { document } = input;
    openStudio(document);
  }

  return (
    <Action.SubmitForm title="Open in AsyncAPI Studio" onSubmit={(input: OpenInStudioInput) => openInStudio(input)} />
  );
}
