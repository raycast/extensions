import { List } from "@raycast/api";

interface Props {
  setCompressVal: (value: string) => void;
}

const DropdownComponent = ({ setCompressVal }: Props) => {
  return (
    <List.Dropdown
      tooltip="Select Compression"
      onChange={(value) => {
        try {
          console.log(`selected val : ${value}`);
          setCompressVal(value); // Ensure this line is called
        } catch (error) {
          console.error("Error setting compression value:", error);
          // Handle the error appropriately
        }
      }}
    >
      <List.Dropdown.Item title="Max Compression" value={"max"} />
      <List.Dropdown.Item title="Balanced" value={"web"} />
      <List.Dropdown.Item title="Best Quality" value={"mrc"} />
      <List.Dropdown.Item title="archive" value={"archive"} />
    </List.Dropdown>
  );
};

export default DropdownComponent;
