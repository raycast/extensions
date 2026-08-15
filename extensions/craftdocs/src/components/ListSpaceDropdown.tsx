import { List } from "@raycast/api";

type ListSpaceDropdownProps = {
  value: string;
  spaces: Array<{ id: string; title: string }>;
  onChange: (newValue: string) => void;
  includeAll?: boolean;
  allTitle?: string;
};

export default function ListSpaceDropdown({
  value,
  spaces,
  onChange,
  includeAll = false,
  allTitle = "All Spaces",
}: ListSpaceDropdownProps) {
  return (
    <List.Dropdown value={value} tooltip="Select Space" onChange={onChange}>
      <List.Dropdown.Section title="Spaces">
        {includeAll ? <List.Dropdown.Item key="all" title={allTitle} value="all" /> : null}
        {spaces.map((space) => (
          <List.Dropdown.Item key={space.id} title={space.title} value={space.id} />
        ))}
      </List.Dropdown.Section>
    </List.Dropdown>
  );
}
