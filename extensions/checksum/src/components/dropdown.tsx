import { Form } from "@raycast/api";

export function HashDropdown() {
  return (
    <Form.Dropdown id="dropdown" title="Hash Algorithm" defaultValue="sha256">
      <Form.Dropdown.Section title="MD5">
        <Form.Dropdown.Item value="md5" title="MD5" />
      </Form.Dropdown.Section>

      <Form.Dropdown.Section title="SHA-1">
        <Form.Dropdown.Item value="sha1" title="SHA-1" />
      </Form.Dropdown.Section>

      <Form.Dropdown.Section title="SHA-2 Family">
        <Form.Dropdown.Item value="sha224" title="SHA-224" />
        <Form.Dropdown.Item value="sha256" title="SHA-256" />
        <Form.Dropdown.Item value="sha384" title="SHA-384" />
        <Form.Dropdown.Item value="sha512" title="SHA-512" />
      </Form.Dropdown.Section>

      <Form.Dropdown.Section title="SHA-3 Family">
        <Form.Dropdown.Item value="sha3-224" title="SHA3-224" />
        <Form.Dropdown.Item value="sha3-256" title="SHA3-256" />
        <Form.Dropdown.Item value="sha3-384" title="SHA3-384" />
        <Form.Dropdown.Item value="sha3-512" title="SHA3-512" />
      </Form.Dropdown.Section>

      <Form.Dropdown.Section title="BLAKE2">
        <Form.Dropdown.Item value="blake2b512" title="BLAKE2b-512" />
        <Form.Dropdown.Item value="blake2s256" title="BLAKE2s-256" />
      </Form.Dropdown.Section>

      <Form.Dropdown.Section title="Other">
        <Form.Dropdown.Item value="ripemd160" title="RIPEMD-160" />
      </Form.Dropdown.Section>
    </Form.Dropdown>
  );
}
