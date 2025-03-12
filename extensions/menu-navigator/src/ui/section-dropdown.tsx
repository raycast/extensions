import { List } from "@raycast/api";
import { SectionTypes } from "../types";

export function SectionDropdown(props: {
  sections: SectionTypes[];
  onSectionFilter: (val: string) => void;
  defaultValue: string;
}) {
  const { sections, onSectionFilter, defaultValue } = props;
  return (
    <List.Dropdown
      tooltip="Filters"
      storeValue={false}
      onChange={(newValue) => onSectionFilter(newValue)}
      defaultValue={defaultValue}
    >
      <List.Dropdown.Item title="All Commands" value="all-commands" />
      <List.Dropdown.Item title="Menu Commands" value="menu-commands" />
      <List.Dropdown.Section title="Menus">
        {sections.map((s) => (
          <List.Dropdown.Item key={s.id} title={s.value} value={s.id} />
        ))}
      </List.Dropdown.Section>
      <List.Dropdown.Section title="Shortcuts">
        <List.Dropdown.Item title="Assigned" value="shortcut-commands" />
        <List.Dropdown.Item title="Unassigned" value="no-shortcut-commands" />
      </List.Dropdown.Section>
    </List.Dropdown>
  );
}
