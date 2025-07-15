import { Form } from "@raycast/api";
import { DEFAULT_START_DATE } from "./constants";

export default function Command() {
  return (
    <Form>
      <Form.DatePicker id="startDate" title="Start Date" defaultValue={new Date(DEFAULT_START_DATE)} />
    </Form>
  );
}
