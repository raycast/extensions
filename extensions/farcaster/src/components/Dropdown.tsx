import { List } from "@raycast/api";

interface DropdownProps {
  options: {
    label: string;
    value: string;
  }[];
  onDropdownChange: (value: string) => void;
  value: string;
  tooltip?: string;
}

export function Dropdown({ options, onDropdownChange, value, tooltip }: DropdownProps) {
  return (
    <List.Dropdown onChange={onDropdownChange} value={value} tooltip={tooltip || ""}>
      {options.map(({ label, value }) => (
        <List.Dropdown.Item key={value} title={label} value={value} />
      ))}
    </List.Dropdown>
  );
}
