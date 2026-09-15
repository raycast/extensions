import { Form } from "@raycast/api";
import { useState } from "react";
import { getModelOptions } from "./model-options";

type ModelPickerProps = Pick<
  Form.Dropdown.Props,
  "id" | "value" | "onChange" | "onBlur" | "error" | "isLoading" | "info"
> & {
  models: string[];
};

export function ModelPicker({ models, ...props }: ModelPickerProps) {
  const [searchText, setSearchText] = useState("");
  const options = getModelOptions(models, props.value, searchText);

  return (
    <Form.Dropdown
      {...props}
      title="Model"
      placeholder="Search models or enter a model ID"
      info={[
        props.info,
        'Select a model, or type a model ID and select Use "…". You can enter an ID even if the model list is unavailable.',
      ]
        .filter(Boolean)
        .join("\n\n")}
      filtering
      onSearchTextChange={setSearchText}
    >
      {options.map((option) => (
        <Form.Dropdown.Item key={option.value} value={option.value} title={option.title} keywords={[option.value]} />
      ))}
    </Form.Dropdown>
  );
}
