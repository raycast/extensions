import { Form, ActionPanel, Action } from "@raycast/api";
import { exec } from "child_process";

type Values = {
  title: string;
  textarea: string;
  markdown: boolean;
  new_window: string;
  notebook: string;
};

export default function Command() {
  function handleSubmit(values: Values) {
    const cmd = `open 'upnote://x-callback-url/note/new?title=${values.title}&text=${values.textarea}&notebook=${values.notebook}&new_window=${values.new_window}&markdown=${values.markdown}'`;
    exec(cmd);
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Description text="Empty form will bring up UpNote with a new note." />
      <Form.TextField id="title" title="Title" placeholder="Enter title" />
      <Form.TextArea
        id="textarea"
        title="Text area"
        placeholder="Enter multi-line text"
        info="Textarea supports markdown format"
      />
      <Form.TextField
        id="notebook"
        title="Notebook"
        placeholder="My Notebook"
        info="Title of the notebook should exactly match"
      />
    </Form>
  );
}
