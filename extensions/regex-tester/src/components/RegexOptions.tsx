import { FC } from "react";
import { List } from "@raycast/api";

export type Options = string;

interface Props {
  onOptionsChange: (options: Options) => void;
}

const RegexOptions: FC<Props> = ({ onOptionsChange }) => {
  return (
    <List.Dropdown tooltip="Regex Options" defaultValue="gm" onChange={onOptionsChange}>
      <List.Dropdown.Item title="No Modifiers" value="" />
      <List.Dropdown.Item title="Global (/g)" value="g" />
      <List.Dropdown.Item title="Case-Insensitive (/i)" value="i" />
      <List.Dropdown.Item title="Multiline (/m)" value="m" />
      <List.Dropdown.Item title="Global, Case-Insensitive (/gi)" value="gi" />
      <List.Dropdown.Item title="Global, Multiline (/gm)" value="gm" />
      <List.Dropdown.Item title="Case-Insensitive, Multiline (/im)" value="im" />
      <List.Dropdown.Item title="All Modifiers (/gim)" value="gim" />
    </List.Dropdown>
  );
};

export default RegexOptions;
