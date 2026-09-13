import { List } from "@raycast/api";

import { Instance } from "../api/types";

interface Props {
  instances: Instance[];
  value: string | undefined;
  onChange: (id: string) => void;
}

/** Hidden with a single instance; Raycast allows only one search bar accessory. */
export function InstanceDropdown({ instances, value, onChange }: Props) {
  if (instances.length < 2) return null;

  return (
    <List.Dropdown tooltip="Targetprocess Instance" value={value} onChange={onChange} storeValue={false}>
      {instances.map((instance) => (
        <List.Dropdown.Item key={instance.id} value={instance.id} title={instance.label} />
      ))}
    </List.Dropdown>
  );
}
