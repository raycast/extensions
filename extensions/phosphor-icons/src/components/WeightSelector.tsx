import { Grid } from "@raycast/api";

type WeightSelectorProps = {
  /**
   * Function to call when the weight is changed.
   * @param value The new weight value.
   */
  onChange: (value: string) => void;

  /**
   * The weight value to initially select.
   */
  defaultValue: string;
};

export default function WeightSelector(props: WeightSelectorProps) {
  const { onChange, defaultValue } = props;
  return (
    <Grid.Dropdown
      tooltip="Select Weight"
      defaultValue={defaultValue}
      storeValue
      onChange={(value) => {
        onChange(value);
      }}
    >
      <Grid.Dropdown.Item title="Regular" value="regular" />
      <Grid.Dropdown.Item title="Bold" value="bold" />
      <Grid.Dropdown.Item title="Light" value="light" />
      <Grid.Dropdown.Item title="Duotone" value="duotone" />
      <Grid.Dropdown.Item title="Fill" value="fill" />
      <Grid.Dropdown.Item title="Thin" value="thin" />
    </Grid.Dropdown>
  );
}
