import { Form, ActionPanel, Action, showToast } from "@raycast/api";
import got from "got";

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
    try {
      const response = await got.post("https://eovfcg8wra1o6s5.m.pipedream.net", {
        json: values,
        responseType: "json",
      });

      showToast({ title: "Event added", message: "Successfully submitted values" });
    } catch (error) {
      console.error(error);
      showToast({ title: "Error", message: "Failed to submit values" });
    }
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm onSubmit={handleSubmit} title="Add event" />
        </ActionPanel>
      }
    >
      {/* <Form.Description text="This form showcases all available form elements." /> */}
      <Form.TextArea id="eventdetails" title="Event details" placeholder="Any info about your event" />
      <Form.TextField
        id="calendar"
        title="Calendar"
        placeholder="Which calendar to add the event"
        defaultValue="Personal"
      />
      <Form.TextField
        id="timezone"
        title="Time zone"
        placeholder="What timezone you are in"
        defaultValue="Los Angeles"
      />
      {/* <Form.Separator />
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
