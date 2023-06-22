import { ActionPanel, Form } from "@raycast/api";

import { AddToReadingListAction } from "./components";

const Command = () => {
  return (
    <Form
      actions={
        <ActionPanel>
          <AddToReadingListAction />
        </ActionPanel>
      }
    >
      <Form.TextField id="url" title="URL" />
    </Form>
  );
};

export default Command;
