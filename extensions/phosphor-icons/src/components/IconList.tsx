import { useCachedState } from "@raycast/utils";
import WeightSelector from "./WeightSelector";
import { List } from "@raycast/api";
import { icons } from "@phosphor-icons/core";
import IconListItem from "./IconListItem";

export default function IconList() {
  const [selectedWeight, setSelectedWeight] = useCachedState<string>("weight", "regular");

  return (
    <List
      searchBarPlaceholder={`Search ${icons.length} icons...`}
      searchBarAccessory={<WeightSelector onChange={setSelectedWeight} defaultValue="regular" />}
    >
      <List.EmptyView icon={"no-view.png"} title="No Icons Found" description="Try a different query." />
      {icons.map((icon) => (
        <IconListItem key={icon.name} icon={icon} selectedWeight={selectedWeight} />
      ))}
    </List>
  );
}
