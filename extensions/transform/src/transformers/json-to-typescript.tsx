import { Form } from "@raycast/api";
import { JSONWasm } from "json-wasm";

export const TransformJSONtoTypescript = {
  from: "JSON",
  to: "Typescript",
  Options: (props: OptionsComponentProps) => {
    return (
      <Form.Dropdown id="format" title="Format" onChange={(format) => props.setOptions({ format })}>
        <Form.Dropdown.Item value="typescript" title="Interface" />
        <Form.Dropdown.Item value="typescript/typealias" title="Type" />
      </Form.Dropdown>
    );
  },
  transform: async (
    value: string,
    options: {
      format: "typescript" | "typescript/typealias";
    }
  ) => {
    JSON.parse(value);
    return await JSONWasm("Root", value, { output_mode: options.format });
  },
};
