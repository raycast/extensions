import { List } from "@raycast/api";
import { Option } from "../types";

export function ExtensionTypeDropdown(props: {
  extensionTypes: Option[];
  onExtensionTypeChange: (newValue: string) => void;
}) {
  const { extensionTypes, onExtensionTypeChange } = props;
  return (
    <List.Dropdown tooltip="Select Extension Type" storeValue={true} onChange={onExtensionTypeChange}>
      <List.Dropdown.Section title="Extension Type">
        {extensionTypes.map((extensionType) => (
          <List.Dropdown.Item key={extensionType.id} title={extensionType.name} value={extensionType.id} />
        ))}
      </List.Dropdown.Section>
    </List.Dropdown>
  );
}
