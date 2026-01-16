import { Form } from "@raycast/api";
import { useMemo, useEffect, useRef } from "react";
import { useCustomAgents } from "../hooks/useCustomAgents";

export function CustomAgentsDropdown(props: {
  itemProps: Form.ItemProps<string>;
  repository?: string;
  onLoadingChange?: (isLoading: boolean) => void;
}) {
  const { customAgents, isLoading } = useCustomAgents(props.repository ?? "");

  const { onChange, value, ...restItemProps } = props.itemProps;
  const previousRepository = useRef(props.repository);

  // Clear custom agent value when repository changes
  useEffect(() => {
    if (previousRepository.current && previousRepository.current !== props.repository) {
      // Repository changed, clear the current custom agent value
      onChange?.("");
    }
    previousRepository.current = props.repository;
  }, [props.repository, onChange]);

  // Notify parent about loading state changes
  useEffect(() => {
    props.onLoadingChange?.(isLoading);
  }, [isLoading, props.onLoadingChange]);

  const controlledValue = useMemo(() => {
    if (value && customAgents.some((agent) => agent.name === value)) {
      return value;
    } else if (customAgents.length > 0) {
      return customAgents[0].name;
    } else {
      return ""; // Fallback to empty string to keep it controlled
    }
  }, [customAgents, value]);
  // Update the form value when controlledValue changes
  useEffect(() => {
    if (controlledValue && controlledValue !== value && onChange) {
      onChange(controlledValue);
    }
  }, [controlledValue, value, onChange]);

  return (
    <Form.Dropdown
      title="Custom Agent"
      placeholder="Select a custom agent"
      isLoading={isLoading}
      onChange={(value) => {
        onChange?.(value);
      }}
      value={controlledValue}
      {...restItemProps}
    >
      {customAgents.map((agent) => (
        <Form.Dropdown.Item key={`${props.repository}-${agent.name}`} title={agent.display_name} value={agent.name} />
      ))}
    </Form.Dropdown>
  );
}
