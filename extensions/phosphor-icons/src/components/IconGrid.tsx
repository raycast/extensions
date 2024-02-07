import { useCachedState } from "@raycast/utils";
import WeightSelector from "./WeightSelector";
import { Grid } from "@raycast/api";
import { icons } from "@phosphor-icons/core";
import IconGridItem from "./IconGridItem";

type IconGridProps = {
  /**
   * The number of columns to display.
   */
  columns: number;
};

export default function IconGrid(props: IconGridProps) {
  const { columns } = props;
  const [selectedWeight, setSelectedWeight] = useCachedState<string>("weight", "regular");

  return (
    <Grid
      searchBarPlaceholder={`Search ${icons.length} icons...`}
      columns={columns}
      searchBarAccessory={<WeightSelector onChange={setSelectedWeight} defaultValue="regular" />}
      inset={Grid.Inset.Medium}
    >
      <Grid.EmptyView icon={"no-view.png"} title="No Icons Found" description="Try a different query." />
      {icons.map((icon) => (
        <IconGridItem key={icon.name} icon={icon} selectedWeight={selectedWeight} />
      ))}
    </Grid>
  );
}
