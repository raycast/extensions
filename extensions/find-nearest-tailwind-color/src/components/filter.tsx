import { Grid } from "@raycast/api";

export enum VersionsFilterType {
  v3_3 = "V3.3",
  v3_2 = "V3.2",
  v2 = "V2",
}

export function VersionsFilterDropdown(props: { onSelect: (value: VersionsFilterType) => void }): JSX.Element {
  return (
    <Grid.Dropdown
      tooltip="Get by version"
      storeValue={true}
      defaultValue={VersionsFilterType.v3_3}
      onChange={(value: string) => {
        props.onSelect(value as VersionsFilterType);
      }}
    >
      {Object.values(VersionsFilterType).map((value) => (
        <Grid.Dropdown.Item key={value} value={value} title={value} />
      ))}
    </Grid.Dropdown>
  );
}
