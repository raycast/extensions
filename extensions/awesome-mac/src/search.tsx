import { useState } from "react";
import { ActionPanel, Action, Icon, Grid, Color } from "@raycast/api";

export default function Command() {
  const [columns, setColumns] = useState(5);
  const [isLoading, setIsLoading] = useState(true);
  return (
    <Grid
      columns={columns}
      inset={Grid.Inset.Large}
      isLoading={isLoading}
      searchBarAccessory={
        <Grid.Dropdown
          tooltip="Grid Item Size"
          storeValue
          onChange={(newValue) => {
            setColumns(parseInt(newValue));
            setIsLoading(false);
          }}
        >
          <Grid.Dropdown.Item title="Large" value={"3"} />
          <Grid.Dropdown.Item title="Medium" value={"5"} />
          <Grid.Dropdown.Item title="Small" value={"8"} />
        </Grid.Dropdown>
      }
    >
      {!isLoading &&
        Object.entries(Icon).map(([name, icon]) => (
          <Grid.Item
            key={name}
            content={{ value: { source: icon, tintColor: Color.PrimaryText }, tooltip: name }}
            title={name}
            subtitle={icon}
            actions={
              <ActionPanel>
                <Action.CopyToClipboard content={icon} />
              </ActionPanel>
            }
          />
        ))}
    </Grid>
  );
}
