import { List } from "@raycast/api";
import { SEARCH_TYPE_ORDER, SEARCH_TYPES, SWITCH_TYPE_HINT, type SearchType } from "../lib/searchTypes";

interface SearchTypeDropdownProps {
  value: SearchType;
  onChange: (type: SearchType) => void;
}

export function SearchTypeDropdown({ value, onChange }: SearchTypeDropdownProps) {
  return (
    <List.Dropdown
      tooltip={`Search Type (${SWITCH_TYPE_HINT} to switch)`}
      value={value}
      onChange={(type) => onChange(type as SearchType)}
    >
      <List.Dropdown.Section title={`${SWITCH_TYPE_HINT} to switch`}>
        {SEARCH_TYPE_ORDER.map((type) => (
          <List.Dropdown.Item key={type} title={SEARCH_TYPES[type].title} icon={SEARCH_TYPES[type].icon} value={type} />
        ))}
      </List.Dropdown.Section>
    </List.Dropdown>
  );
}
