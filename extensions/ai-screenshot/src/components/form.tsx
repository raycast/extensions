import { ActionPanel, Form } from "@raycast/api";
import { ModifyAction } from "../actions/ModificationAction";

export default function ModifyForm() {
  return (
    <Form
      actions={
        <ActionPanel>
          <ModifyAction />
        </ActionPanel>
      }
    >
      <Form.TextArea id="modificationPrompt" title="Modification Prompt" />
    </Form>
  );
}
