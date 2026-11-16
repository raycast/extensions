import { Action, ActionPanel, Form, popToRoot } from "@raycast/api";
import { COFFEE, runCoffee } from "./coffee";

export default function NewNote() {
  async function submit(values: { title: string; text: string }) {
    if (await runCoffee("new", { title: values.title.trim(), text: values.text })) await popToRoot();
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Create in Coffee" icon={COFFEE} onSubmit={submit} />
        </ActionPanel>
      }
    >
      <Form.TextField id="title" title="Title" placeholder="Untitled" />
      <Form.TextArea id="text" title="Text" placeholder="Markdown works here" enableMarkdown />
    </Form>
  );
}
