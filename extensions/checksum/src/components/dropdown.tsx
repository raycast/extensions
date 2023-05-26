import { Form } from "@raycast/api";

export function HashDropdown() {
  return (
    <Form.Dropdown id="dropdown" title="Hashing Algorithm">
      <Form.Dropdown.Item value="sha1" title="sha1" />
      <Form.Dropdown.Item value="sha224" title="sha224" />
      <Form.Dropdown.Item value="sha256" title="sha256" />
      <Form.Dropdown.Item value="sha512" title="sha512" />
    </Form.Dropdown>
  );
}
