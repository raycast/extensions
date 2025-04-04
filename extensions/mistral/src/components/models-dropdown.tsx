import { List } from "@raycast/api";
import { useCurrentModel } from "../hooks/use-current-model";

const models = [
  { id: "mistral-small-latest", name: "Mistral Small" },
  { id: "mistral-large-latest", name: "Mistral Large" },
];

export function ModelDropdown() {
  const { value, setValue } = useCurrentModel();

  if (!value) return null;

  return (
    <List.Dropdown tooltip="Models" value={value} onChange={setValue}>
      {models.map((model) => (
        <List.Dropdown.Item key={model.id} title={model.name} value={model.id} />
      ))}
    </List.Dropdown>
  );
}
