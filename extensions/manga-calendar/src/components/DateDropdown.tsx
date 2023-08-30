import { List } from "@raycast/api";

interface Props {
  dateList: string[];
  onDropdownChange: (text: string) => void;
}

export function DateDropdown({ dateList, onDropdownChange }: Props) {
  return (
    <List.Dropdown tooltip="Select a date" storeValue={true} onChange={(newValue) => onDropdownChange(newValue)}>
      <List.Dropdown.Item title="Show All" value="" />
      {dateList && dateList.map((date, idx) => <List.Dropdown.Item key={idx + date} title={date} value={date} />)}
    </List.Dropdown>
  );
}
