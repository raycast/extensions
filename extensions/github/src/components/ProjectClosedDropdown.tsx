import { List } from "@raycast/api";

type ProjectClosedDropdownProps = {
  setClosed: React.Dispatch<React.SetStateAction<string>>;
};

export default function ProjectClosedDropdown({ setClosed }: ProjectClosedDropdownProps) {
  return (
    <List.Dropdown tooltip="Select Project State" storeValue onChange={setClosed} defaultValue="open">
      <List.Dropdown.Item key={"All"} title={"All"} value={"all"} />
      <List.Dropdown.Item key={"Open"} title={"Open"} value={"open"} />
      <List.Dropdown.Item key={"Closed"} title={"Closed"} value={"closed"} />
    </List.Dropdown>
  );
}
