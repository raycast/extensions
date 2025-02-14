import { List } from "@raycast/api";

type ObservationFileTypeFilterProps = {
  onChange: (newFileType: string) => void;
  value: string;
  options: string[];
};

export function ObservationFileTypeFilter(props: ObservationFileTypeFilterProps) {
  const { onChange, value, options } = props;

  const handleChange = (newFileType: string) => {
    onChange(newFileType);
  };

  return (
    <List.Dropdown tooltip="Select Page" defaultValue={options[0]} value={value} storeValue onChange={handleChange}>
      {options.map((option) => {
        return <List.Dropdown.Item title={option} value={option} />;
      })}
    </List.Dropdown>
  );
}
