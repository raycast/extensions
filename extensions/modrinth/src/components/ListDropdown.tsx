import DropdownType from "../models/DropdownType";
import { List } from "@raycast/api";
import { ReactElement } from "react";

export default function ListDropdown({
  dropdownChoiceTypes,
  onDropdownChange,
  tooltip,
  defaultValue,
  storeValue,
  title,
  showAll,
  customSection,
}: {
  dropdownChoiceTypes: DropdownType[];
  onDropdownChange: (newVal: string) => void;
  tooltip: string;
  defaultValue?: string;
  storeValue?: boolean;
  title: string;
  showAll?: boolean;
  customSection?: ReactElement;
}) {
  return (
    <List.Dropdown
      tooltip={tooltip}
      onChange={onDropdownChange}
      defaultValue={defaultValue}
      storeValue={storeValue ?? false}
    >
      {showAll && (
        <List.Dropdown.Section>
          <List.Dropdown.Item key={"all"} title={"Show All"} value={"all-loaders"} />
        </List.Dropdown.Section>
      )}
      <List.Dropdown.Section title={title}>
        {dropdownChoiceTypes.map((choiceType) => (
          <List.Dropdown.Item key={choiceType.id} title={choiceType.name} value={choiceType.id} />
        ))}
      </List.Dropdown.Section>
      {customSection}
    </List.Dropdown>
  );
}
