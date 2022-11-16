import { ActionPanel, Form, SubmitFormAction, popToRoot } from "@raycast/api";
import { openUlyssesCallback } from "./utils";

interface Values {
  group_name: string;
}

export default function NewGroup() {
  async function handleSubmit(values: Values) {
    await openUlyssesCallback("ulysses://x-callback-url/new-group?name=" + values.group_name);
    popToRoot();
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <SubmitFormAction title="Create Group" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField id="group_name" placeholder="Enter Group Name" title="Group Name" />
    </Form>
  );
}
