import { Form } from "@raycast/api";
import { condense } from "strings-to-regex";

export const TransformStringToRegex = {
  from: "String",
  to: "Regex",
  Options: (props: OptionsComponentProps) => {
    return (
      <Form.Dropdown id="splitBy" title="Split by" onChange={(splitBy) => props.setOptions({ splitBy })}>
        <Form.Dropdown.Item value=" " title="Space" />
        <Form.Dropdown.Item value="," title="Comma" />
        <Form.Dropdown.Item value={"\n"} title="Newline" />
      </Form.Dropdown>
    );
  },
  transform: (value: string, options: { splitBy: string }) => {
    return `/${condense(value.split(options.splitBy)).source}/`;
  },
};
