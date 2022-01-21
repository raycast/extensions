import { ActionPanel, Form, SubmitFormAction } from "@raycast/api";
import { openUlyssesCallback } from "./utils";

export default function NewGroup() {
  return (
    <Form
      actions={
        <ActionPanel>
          <SubmitFormAction
            title="Create Group"
            onSubmit={(values) => openUlyssesCallback("ulysses://x-callback-url/new-group?name=" + values.group_name)}
          />
        </ActionPanel>
      }
    >
      <Form.TextField id="group_name" placeholder="Enter Group Name" title="Group Name" />
    </Form>
  );
}
