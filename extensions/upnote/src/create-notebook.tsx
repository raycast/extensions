import { Form, ActionPanel, Action, open } from "@raycast/api";
import { buildUpnoteUrl } from "./upnote-url";

type Values = {
  notebook: string;
};

export default function Command() {
  async function handleSubmit(values: Values) {
    await open(buildUpnoteUrl("notebook/new", { title: values.notebook }));
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Description text="Empty form will bring up UpNote with a new notebook." />
      <Form.TextField id="notebook" title="Notebook" placeholder="Enter text" />
    </Form>
  );
}
