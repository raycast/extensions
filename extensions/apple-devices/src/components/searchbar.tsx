import { getPreferenceValues, Grid } from "@raycast/api";
import { Preferences } from "../types";
import React from "react";

function SearchBar(props: { onChange: (value: string) => void }) {
  const preferences = getPreferenceValues<Preferences>();
  const isLatest = preferences.device === "latest";

  return (
    <Grid.Dropdown
      tooltip="Devices"
      onChange={props.onChange}
      storeValue={isLatest}
      defaultValue={!isLatest ? preferences.device : undefined}
    >
      <Grid.Dropdown.Item title="All" value="all" />
      <Grid.Dropdown.Item title="iPhone" value="iPhone" />
      <Grid.Dropdown.Item title="iPad" value="iPad" />
      <Grid.Dropdown.Item title="iPod touch" value="iPod" />
      <Grid.Dropdown.Item title="Apple Watch" value="Apple Watch" />
    </Grid.Dropdown>
  );
}

export default React.memo(SearchBar);
