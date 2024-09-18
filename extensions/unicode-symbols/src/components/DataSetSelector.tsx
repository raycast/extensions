import { List } from "@raycast/api";

import { useListContext } from "@/context/ListContext";

const DataSetSelector = () => {
  const { availableSets, setDatasetFilterAnd } = useListContext();

  return (
    <List.Dropdown
      tooltip="Select a character set"
      onChange={(val) => setDatasetFilterAnd(val === "null" ? null : val)}
    >
      <List.Dropdown.Item key="all" title="<All Characters>" value={"null"} />
      {availableSets.map((set) => (
        <List.Dropdown.Item key={set} title={set} value={set} />
      ))}
    </List.Dropdown>
  );
};

export default DataSetSelector;
