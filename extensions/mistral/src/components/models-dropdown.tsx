import { List } from "@raycast/api";
import { useCurrentModel } from "../hooks/use-current-model";
import { FALLBACK_MODELS } from "../utils/models";

export function ModelDropdown() {
  const { value, setValue } = useCurrentModel();

  if (!value) return null;

  return (
    <List.Dropdown tooltip="Models" value={value} onChange={setValue}>
      {FALLBACK_MODELS.map((model) => (
        <List.Dropdown.Item key={model.id} title={model.name} value={model.id} />
      ))}
    </List.Dropdown>
  );
}
