import { List } from "@raycast/api";
import { TAB_TYPE } from "../constants";

type DropDownItem = { id: string; name: TAB_TYPE };

export function TabTypeDropdown(props: {
  tabTypes: (DropDownItem | undefined)[];
  onTabTypeChange: (newValue: string) => void;
}) {
  const { tabTypes, onTabTypeChange } = props;
  return (
    <List.Dropdown
      tooltip="Choose a list"
      placeholder="Choose a list..."
      storeValue={true}
      onChange={(newValue) => {
        onTabTypeChange(newValue);
      }}
    >
      <List.Dropdown.Section title="Lists">
        {tabTypes.map((tabType, i) => (
          <List.Dropdown.Item key={tabType?.id ?? i} title={tabType?.name ?? ""} value={tabType?.name ?? ""} />
        ))}
      </List.Dropdown.Section>
    </List.Dropdown>
  );
}
