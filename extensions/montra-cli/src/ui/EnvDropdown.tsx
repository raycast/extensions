import { Form } from "@raycast/api";
import { getPrefs, Environment } from "../utils/exec";

export default function EnvDropdown(props: { id?: string; title?: string; defaultValue?: Environment }) {
  const prefs = getPrefs();
  const id = props.id ?? "environment";
  const title = props.title ?? "Environment";
  const def = props.defaultValue ?? prefs.defaultEnvironment;
  return (
    <Form.Dropdown id={id} title={title} defaultValue={def}>
      <Form.Dropdown.Item value="development" title="Development" />
      <Form.Dropdown.Item value="staging" title="Staging" />
      <Form.Dropdown.Item value="production" title="Production" />
    </Form.Dropdown>
  );
}
