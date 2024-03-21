import { Form } from "@raycast/api";

export function HashDropdown() {
  return (
    <Form.Dropdown id="dropdown" title="Hashing Algorithm">
      <Form.Dropdown.Item value="sha1" title="SHA-1" />
      <Form.Dropdown.Item value="sha224" title="SHA-224" />
      <Form.Dropdown.Item value="sha256" title="SHA-256" />
      <Form.Dropdown.Item value="sha512" title="SHA-512" />
    </Form.Dropdown>
  );
}
