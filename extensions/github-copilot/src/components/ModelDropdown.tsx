import { Form } from "@raycast/api";
import { useMemo, useEffect } from "react";
import { useModels } from "../hooks/useModels";

const getTitle = (name: string, multiplier: number | undefined) => {
  if (multiplier === undefined || multiplier === 1) {
    return name;
  } else {
    return `${name} (${multiplier}x)`;
  }
};

export function ModelDropdown(props: {
  itemProps: Form.ItemProps<string>;
  onLoadingChange?: (isLoading: boolean) => void;
}) {
  const { models, isLoading } = useModels();

  const { onChange, value, ...restItemProps } = props.itemProps;

  // Notify parent about loading state changes
  useEffect(() => {
    props.onLoadingChange?.(isLoading);
  }, [isLoading, props.onLoadingChange]);

  const controlledValue = useMemo(() => {
    if (value && models.map((model) => model.id).includes(value)) {
      return value;
    } else if (models.length > 0) {
      return models[0].id;
    } else {
      return ""; // Fallback to empty string to keep it controlled
    }
  }, [models, value]);

  // Update the form value when controlledValue changes
  useEffect(() => {
    if (controlledValue && controlledValue !== value && onChange) {
      onChange(controlledValue);
    }
  }, [controlledValue, value, onChange]);

  if (models.length === 0) return null;

  return (
    <Form.Dropdown
      title="Model"
      placeholder="Select a model"
      isLoading={isLoading}
      onChange={(value) => {
        onChange?.(value);
      }}
      value={controlledValue}
      {...restItemProps}
    >
      {models.map((model) => (
        <Form.Dropdown.Item key={model.name} title={getTitle(model.name, model.billing?.multiplier)} value={model.id} />
      ))}
    </Form.Dropdown>
  );
}
