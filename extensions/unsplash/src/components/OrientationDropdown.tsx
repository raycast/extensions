import { Grid } from "@raycast/api";
import { Orientation } from "@/types";

interface Props {
  onChange: (value: Orientation) => void;
}

export function OrientationDropdown({ onChange }: Props) {
  return (
    <Grid.Dropdown
      tooltip="Orientation"
      storeValue
      defaultValue="landscape"
      onChange={(v) => onChange(v as Orientation)}
    >
      <Grid.Dropdown.Section title="Orientation">
        <Grid.Dropdown.Item title="All" value="all" />
        <Grid.Dropdown.Item title="Landscape" value="landscape" />
        <Grid.Dropdown.Item title="Portrait" value="portrait" />
        <Grid.Dropdown.Item title="Squarish" value="squarish" />
      </Grid.Dropdown.Section>
    </Grid.Dropdown>
  );
}

export default OrientationDropdown;
