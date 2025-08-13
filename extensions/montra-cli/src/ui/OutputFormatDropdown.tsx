import { Form } from "@raycast/api";
import { getPrefs, OutputFormat } from "../utils/exec";

export default function OutputFormatDropdown(props: { id?: string; title?: string; defaultValue?: OutputFormat }) {
  const prefs = getPrefs();
  const id = props.id ?? "output";
  const title = props.title ?? "Output";
  const def = props.defaultValue ?? prefs.defaultOutputFormat;
  return (
    <Form.Dropdown id={id} title={title} defaultValue={def}>
      <Form.Dropdown.Item value="pretty" title="Pretty" />
      <Form.Dropdown.Item value="json" title="JSON" />
    </Form.Dropdown>
  );
}
