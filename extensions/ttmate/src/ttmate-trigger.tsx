import { Form, ActionPanel, Action, closeMainWindow } from "@raycast/api";
import fetch from "node-fetch";

type Values = {
  textfield: string;
  textarea: string;
  datepicker: Date;
  checkbox: boolean;
  dropdown: string;
  tokeneditor: string[];
};

export default function Command() {
  async function handleSubmit(values: Values) {
    await fetch("http://127.0.0.1:3001/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ message: values.textfield }),
    });

    closeMainWindow();
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Description text="This form showcases all available form elements." />
      <Form.TextField id="textfield" title="Prompt" placeholder="Enter text" defaultValue="Raycast" />
      {/* <Form.TextArea id="textarea" title="Text area" placeholder="Enter multi-line text" />
      <Form.Separator />
      <Form.DatePicker id="datepicker" title="Date picker" />
      <Form.Checkbox id="checkbox" title="Checkbox" label="Checkbox Label" storeValue />
      <Form.Dropdown id="dropdown" title="Dropdown">
        <Form.Dropdown.Item value="dropdown-item" title="Dropdown Item" />
      </Form.Dropdown>
      <Form.TagPicker id="tokeneditor" title="Tag picker">
        <Form.TagPicker.Item value="tagpicker-item" title="Tag Picker Item" />
      </Form.TagPicker> */}
    </Form>
  );
}
