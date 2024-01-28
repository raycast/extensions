import { useCachedState } from "@raycast/utils";
import WeightSelector from "./WeightSelector";
import { List } from "@raycast/api";
import { icons } from "@phosphor-icons/core";
import IconListItem from "./IconListItem";

type IconListProps = {
  /**
   * Whether or not the list is loading.
   */
  isLoading: boolean;
};

export default function IconList(props: IconListProps) {
  const { isLoading } = props;
  const [selectedWeight, setSelectedWeight] = useCachedState<string>("weight", "regular");

  return (
    <List
      searchBarPlaceholder={`Search ${icons.length} icons...`}
      searchBarAccessory={<WeightSelector onChange={setSelectedWeight} defaultValue="regular" />}
      isLoading={isLoading}
    >
      <List.EmptyView icon={"no-view.png"} title="No Icons Found" description="Try a different query." />
      {icons.map((icon) => (
        <IconListItem key={icon.name} icon={icon} selectedWeight={selectedWeight} />
      ))}
    </List>
  );
}
