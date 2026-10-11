import { Form } from "@raycast/api";

/** The "Applies to" picker of a recurring occurrence. Read its value with parseReach. */
export function ScopeDropdown() {
  return (
    <Form.Dropdown id="scope" title="Applies to" defaultValue="this">
      <Form.Dropdown.Item value="this" title="This block only" />
      <Form.Dropdown.Item value="future" title="This and all later blocks" />
      <Form.Dropdown.Item value="all" title="Every block in the series" />
    </Form.Dropdown>
  );
}
