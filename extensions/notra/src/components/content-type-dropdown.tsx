import { List } from "@raycast/api";
import { CONTENT_TYPE_OPTIONS } from "../schemas";
import type { ContentTypeFilter } from "../types";

export function ContentTypeDropdown({ onChange }: { onChange: (value: ContentTypeFilter) => void }) {
  return (
    <List.Dropdown
      defaultValue="all"
      onChange={(value) => onChange(value as ContentTypeFilter)}
      storeValue
      tooltip="Filter by Content Type"
    >
      {CONTENT_TYPE_OPTIONS.map((option) => (
        <List.Dropdown.Item icon={option.icon} key={option.value} title={option.title} value={option.value} />
      ))}
    </List.Dropdown>
  );
}
