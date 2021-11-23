import { Form, ActionPanel, SubmitFormAction } from "@raycast/api";

interface MemeForm {
  memes: string[];
}

export default function Command() {
  function handleSubmit(values: MemeForm) {
    console.log(values);
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <SubmitFormAction title="Create" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Dropdown id="memes" title="Memes">
        <Form.DropdownItem value="meme" title="Meme" />
      </Form.Dropdown>
      <Form.Separator />
      <Form.TextField id="line1" title="Text field" placeholder="Enter text" />
      <Form.TextField id="line2" title="Text field" placeholder="Enter text" />
    </Form>
  );
}
