import { Form } from "@raycast/api";

export function LaunchConfigDescription() {
  return <Form.Description title="💡" text={`The YAML configuration must start with a 'name' field.`} />;
}
