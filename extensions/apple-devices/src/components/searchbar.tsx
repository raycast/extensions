import { Grid } from "@raycast/api";
import React from "react";

export default function SearchBar(props: { onChange: (value: string) => void }) {
  return (
    <Grid.Dropdown onChange={props.onChange} tooltip="Devices">
      <Grid.Dropdown.Item title="All" value="all" />
      <Grid.Dropdown.Item title="iPhone" value="iPhone" />
      <Grid.Dropdown.Item title="iPad" value="iPad" />
      <Grid.Dropdown.Item title="iPod touch" value="iPod" />
      <Grid.Dropdown.Item title="Apple Watch" value="Apple Watch" />
    </Grid.Dropdown>
  );
}
