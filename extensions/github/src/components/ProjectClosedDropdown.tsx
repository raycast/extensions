import { Color, Icon, List } from "@raycast/api";

type ProjectClosedDropdownProps = {
  setClosed: React.Dispatch<React.SetStateAction<string>>;
};

export default function ProjectClosedDropdown({ setClosed }: ProjectClosedDropdownProps) {
  return (
    <List.Dropdown tooltip="Select Project State" storeValue onChange={setClosed} defaultValue="open">
      <List.Dropdown.Item key={"All"} title={"All"} value={"all"} icon={Icon.List} />
      <List.Dropdown.Item
        key={"Open"}
        title={"Open"}
        value={"open"}
        icon={{ source: Icon.Checkmark, tintColor: Color.Green }}
      />
      <List.Dropdown.Item
        key={"Closed"}
        title={"Closed"}
        value={"closed"}
        icon={{ source: Icon.Xmark, tintColor: Color.SecondaryText }}
      />
    </List.Dropdown>
  );
}
