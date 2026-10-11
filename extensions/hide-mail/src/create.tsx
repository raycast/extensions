import { Action, ActionPanel, Form, Icon } from "@raycast/api";
import { createAndCopyAlias } from "./utils/create";
import { showInvalidApiKeyToast } from "./utils/invalid-key";

type FormValues = {
  note: string;
};

export default function Command() {
  const handleSubmit = ({ note }: FormValues) => createAndCopyAlias(note, showInvalidApiKeyToast);

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Create Email Alias" icon={Icon.EyeDisabled} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField id="note" title="Note (Optional)" placeholder="What is this email for?" autoFocus={true} />
    </Form>
  );
}
