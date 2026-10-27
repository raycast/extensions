import { Form } from "@raycast/api";
import { useModelOptions } from "../../hooks/useModelOptions";
import { ModelPicker } from "./model-picker";

export function ModelField(
  props: Pick<Form.Dropdown.Props, "id" | "value" | "onChange" | "onBlur" | "error" | "info">,
) {
  const modelOptions = useModelOptions();
  return (
    <>
      <ModelPicker
        id={`${props.id}-available`}
        value={props.value ?? ""}
        onChange={props.onChange}
        models={modelOptions.options}
        isLoading={modelOptions.isLoading}
        info="Choose a discovered model, or enter an ID below."
      />
      <Form.TextField {...props} title="Model ID" placeholder="Enter any model ID" />
    </>
  );
}
