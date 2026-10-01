import { Form } from "@raycast/api";

import { getPriorityIcon } from "../helpers";

export default function PriorityDropdown(props: Omit<Form.Dropdown.Props, "children" | "title">) {
  return (
    <Form.Dropdown {...props} title="Priority">
      <Form.Dropdown.Item title="None" value="" />
      <Form.Dropdown.Item title="High" value="high" icon={getPriorityIcon("high")} />
      <Form.Dropdown.Item title="Medium" value="medium" icon={getPriorityIcon("medium")} />
      <Form.Dropdown.Item title="Low" value="low" icon={getPriorityIcon("low")} />
    </Form.Dropdown>
  );
}
