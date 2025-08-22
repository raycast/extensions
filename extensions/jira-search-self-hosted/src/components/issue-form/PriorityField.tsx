import React from "react";
import { Form, Icon } from "@raycast/api";
import { Priority } from "../../types/jira-types";

interface PriorityFieldProps {
  priorities: Priority[];
  value: string;
  onChange: (value: string) => void;
  isLoading: boolean;
}

/**
 * Component for rendering a priority selection dropdown
 */
export function PriorityField({ priorities, value, onChange, isLoading }: PriorityFieldProps) {
  // Check if selected value exists in the current priorities list
  const valueExists = priorities.some((p) => p.id === value);

  // Use first priority as default if current value doesn't exist in the list
  const safeValue = valueExists ? value : priorities.length > 0 ? priorities[0].id : "";

  return (
    <Form.Dropdown id="priority" title="Priority" value={safeValue} onChange={onChange} isLoading={isLoading}>
      {priorities.length === 0 && <Form.Dropdown.Item key="empty" value="" title="Loading priorities..." />}
      {priorities.map((p) => (
        <Form.Dropdown.Item
          key={p.id}
          value={p.id}
          title={p.name}
          icon={
            (p as Priority & { iconUrl?: string }).iconUrl
              ? { source: (p as Priority & { iconUrl?: string }).iconUrl }
              : Icon.Circle
          }
        />
      ))}
    </Form.Dropdown>
  );
}
