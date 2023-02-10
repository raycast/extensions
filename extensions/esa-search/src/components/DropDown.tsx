import { List } from "@raycast/api";

type Props = {
  onChange: (val: number) => void;
  config: { team: string }[];
};

const DropDown = ({ onChange, config }: Props) => (
  <List.Dropdown
    tooltip="Select Team"
    onChange={(val) => {
      onChange(Number(val));
    }}
  >
    {config.map((c, i) => (
      <List.Dropdown.Item key={i} title={c.team} value={i.toString()} />
    ))}
  </List.Dropdown>
);

export default DropDown;
