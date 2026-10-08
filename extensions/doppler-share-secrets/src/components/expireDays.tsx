import { Form } from "@raycast/api";

export default function ExpireDays() {
  return (
    <>
      <Form.Dropdown id="expireDays" title="Expire After Days" storeValue>
        <Form.Dropdown.Item value="1" title="1 Day" />
        <Form.Dropdown.Item value="2" title="2 Days" />
        <Form.Dropdown.Item value="3" title="3 Days" />
        <Form.Dropdown.Item value="7" title="1 Week" />
        <Form.Dropdown.Item value="14" title="2 Weeks" />
        <Form.Dropdown.Item value="30" title="1 Month" />
        <Form.Dropdown.Item value="90" title="3 Months" />
      </Form.Dropdown>
    </>
  );
}
