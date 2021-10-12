import { ActionPanel, SubmitFormAction, Color, Form, Icon, showToast, ToastStyle } from "@raycast/api";

interface FormValues {
  textField: string;
  textArea: string;
  datePicker: string;
  checkbox: boolean;
  dropdown: string;
  tagPicker: string;
}

export default function Command() {
  function handleSubmit(values: FormValues) {
    console.log(values);
    showToast(ToastStyle.Success, "Submitted form", "See logs for submitted values");
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <SubmitFormAction title="Submit" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField id="textField" title="Textfield" placeholder="Enter text" />
      <Form.TextArea id="textArea" title="Textarea" placeholder="Enter multi-line text" />
      <Form.Separator />
      <Form.DatePicker id="datePicker" title="Date Picker" />
      <Form.Checkbox id="checkbox" title="Checkbox" label="Toggle" storeValue />
      <Form.Dropdown id="dropdown" title="Dropdown" defaultValue="dropdown-item-2">
        <Form.Dropdown.Item value="dropdown-item-1" title="Item 1" />
        <Form.Dropdown.Item value="dropdown-item-2" title="Item 2" icon={Icon.Hammer} />
        <Form.Dropdown.Item
          value="dropdown-item-3"
          title="Item 3"
          icon={{ source: Icon.Hammer, tintColor: Color.Green }}
        />
      </Form.Dropdown>
      <Form.TagPicker id="tagPicker" title="Tag Picker">
        <Form.TagPicker.Item value="tagPicker-item-1" title="Item 1" />
        <Form.TagPicker.Item value="tagPicker-item-2" title="Item 2" icon={Icon.Dot} />
        <Form.TagPicker.Item
          value="tagPicker-item-3"
          title="Item 3"
          icon={{ source: Icon.Dot, tintColor: Color.Blue }}
        />
      </Form.TagPicker>
    </Form>
  );
}
