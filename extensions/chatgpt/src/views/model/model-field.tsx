import { Form } from "@raycast/api";
import { useModelOptions } from "../../hooks/useModelOptions";
import { ModelPicker } from "./model-picker";

export function ModelField(
  props: Pick<Form.Dropdown.Props, "id" | "value" | "onChange" | "onBlur" | "error" | "info">,
) {
  const modelOptions = useModelOptions();
  return <ModelPicker models={modelOptions.options} isLoading={modelOptions.isLoading} {...props} />;
}
