import { List } from "@raycast/api";

const TYPES = ["All", "QEMU", "LXC"];

type VmTypeDropdownProps = {
  onChange: (value: string) => void;
};

export const VmTypeDropdown = ({ onChange }: VmTypeDropdownProps) => {
  return (
    <List.Dropdown tooltip="VM Types" onChange={onChange}>
      {TYPES.map((type) => (
        <List.Dropdown.Item key={type} title={type} value={type.toLowerCase()} />
      ))}
    </List.Dropdown>
  );
};
