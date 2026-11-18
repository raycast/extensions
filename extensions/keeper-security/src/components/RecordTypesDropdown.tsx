import { Color, Icon, List } from "@raycast/api";
import { getRecordaTypeIcon, RECORD_TYPE_TO_TITLE_MAP } from "../lib/helpers";
import { RecordTypes } from "../lib/types";

export const DEFAULT_CATEGORY = "null";

export function RecordTypesDropdown({ onRecordTypeChange }: { onRecordTypeChange: (newValue: string) => void }) {
  return (
    <List.Dropdown
      tooltip="Select Record Type"
      storeValue
      defaultValue={DEFAULT_CATEGORY}
      onChange={onRecordTypeChange}
    >
      <List.Dropdown.Item key={"000"} icon={Icon.AppWindowGrid3x3} title="All Record Types" value={DEFAULT_CATEGORY} />
      {Object.entries(RECORD_TYPE_TO_TITLE_MAP).map(([type, title]) => (
        <List.Dropdown.Item
          key={type}
          title={title}
          value={type}
          icon={{ source: getRecordaTypeIcon(type as RecordTypes), tintColor: Color.PrimaryText }}
        />
      ))}
    </List.Dropdown>
  );
}
