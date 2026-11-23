import { Icon, List } from "@raycast/api";
import { useMemo } from "react";
import type { ModelRef } from "../types";

interface ModelDropdownProps {
  models: ModelRef[];
  value: string | null;
  onChange: (value: string) => void;
}

export function ModelDropdown({ models, value, onChange }: ModelDropdownProps) {
  const groups = useMemo(() => {
    const grouped = new Map<string, { name: string; models: ModelRef[] }>();

    for (const model of models) {
      const group = grouped.get(model.providerId) ?? { name: model.providerName, models: [] };
      group.models.push(model);
      grouped.set(model.providerId, group);
    }

    return grouped;
  }, [models]);

  if (models.length === 0) {
    return (
      <List.Dropdown tooltip="Select Model" value="__empty__">
        <List.Dropdown.Item title="No models available" value="__empty__" icon={Icon.Warning} />
      </List.Dropdown>
    );
  }

  const selectedValue = value && models.some((model) => model.key === value) ? value : models[0].key;

  return (
    <List.Dropdown tooltip="Select Model" value={selectedValue} onChange={onChange} placeholder="Search models">
      {Array.from(groups.entries()).map(([providerId, group]) => (
        <List.Dropdown.Section key={providerId} title={group.name}>
          {group.models.map((model) => (
            <List.Dropdown.Item key={model.key} title={model.modelName} value={model.key} />
          ))}
        </List.Dropdown.Section>
      ))}
    </List.Dropdown>
  );
}
