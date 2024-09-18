import { Form, LocalStorage } from "@raycast/api";

export default function Command() {
  return (
    <Form>
      <Form.Dropdown
        id="format"
        title="Output Format"
        filtering={false}
        storeValue
        onChange={async (value) => {
          await LocalStorage.setItem("format", value);
        }}
      >
        <Form.Dropdown.Item value="raw" title="Raw" />
        <Form.Dropdown.Item value="inline" title="Inline" />
        <Form.Dropdown.Item value="block" title="Block" />
      </Form.Dropdown>
    </Form>
  );
}
