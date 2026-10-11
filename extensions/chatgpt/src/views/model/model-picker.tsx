import { Form } from "@raycast/api";
import { getModelOptions } from "./model-options";

type ModelPickerProps = Pick<
  Form.Dropdown.Props,
  "id" | "value" | "onChange" | "onBlur" | "error" | "isLoading" | "info"
> & {
  models: string[];
};

export function ModelPicker({ models, ...props }: ModelPickerProps) {
  const options = getModelOptions(props.value ? [...models, props.value] : models);

  return (
    <Form.Dropdown
      {...props}
      title="Model"
      placeholder="Choose a model"
      info={[props.info, "Available models are loaded from your account."].filter(Boolean).join("\n\n")}
      filtering
    >
      {options.map((option) => (
        <Form.Dropdown.Item key={option.value} value={option.value} title={option.title} keywords={[option.value]} />
      ))}
    </Form.Dropdown>
  );
}
