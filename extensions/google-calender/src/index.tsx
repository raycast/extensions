import { format } from "date-fns";
import { Form, ActionPanel, Action, showToast, open } from "@raycast/api";

type Values = {
  txtTitle: string;
  txtDesc: string;
  txtPlace: string;
  dpStart: Date;
  dpEnd: Date;
};

export default function Command() {
  function handleSubmit(values: Values) {
    const url = `https://www.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(
      values.txtTitle
    )}&dates=${format(values.dpStart, "yyyyMMdd'T'HHmmss")}/${format(values.dpEnd, "yyyyMMdd'T'HHmmss")}&location=${
      values.txtPlace
    }&details=${encodeURIComponent(values.txtDesc)}&sf=true&output=xml`;
    open(url);
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Description text="create an event link to register and share it!" />
      <Form.TextField id="txtTitle" title="Title" placeholder="Enter title..." defaultValue="" />
      <Form.DatePicker id="dpStart" title="Start Date" type={Form.DatePicker.Type.DateTime} defaultValue={new Date()} />
      <Form.DatePicker id="dpEnd" title="End Date" type={Form.DatePicker.Type.DateTime} defaultValue={new Date()} />
      <Form.Separator />
      <Form.TextField id="txtPlace" title="Place" placeholder="Enter place..." defaultValue="" />
      <Form.TextArea id="txtDesc" title="Description" placeholder="Enter description..." />
      <Form.Separator />
    </Form>
  );
}
