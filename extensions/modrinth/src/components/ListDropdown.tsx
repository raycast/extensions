import { List } from "@raycast/api";
import DropdownType from "../models/DropdownType";
import { ReactElement } from "react";

export default function ListDropdown(props: {
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
      tooltip={props.tooltip}
      onChange={props.onDropdownChange}
      defaultValue={props.defaultValue}
      storeValue={props.storeValue ?? false}
    >
      {props.showAll ? (
        <List.Dropdown.Section>
          <List.Dropdown.Item key={"all"} title={"Show All"} value={"all-loaders"} />
        </List.Dropdown.Section>
      ) : (
        <></>
      )}
      <List.Dropdown.Section title={props.title}>
        {props.dropdownChoiceTypes.map((choiceType) => (
          <List.Dropdown.Item key={choiceType.id} value={choiceType.id} title={choiceType.name} />
        ))}
      </List.Dropdown.Section>
      {props.customSection ?? <></>}
    </List.Dropdown>
  );
}
