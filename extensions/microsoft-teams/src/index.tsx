import { useState } from "react";
import { ActionPanel, Action, Icon, Grid, Color } from "@raycast/api";

export default function Command() {
  const [itemSize, setItemSize] = useState<Grid.ItemSize>(Grid.ItemSize.Medium);
  const [isLoading, setIsLoading] = useState(true);
  return (
    <Grid
      itemSize={itemSize}
      inset={Grid.Inset.Large}
      isLoading={isLoading}
      searchBarAccessory={
        <Grid.Dropdown
          tooltip="Grid Item Size"
          storeValue
          onChange={(newValue) => {
            setItemSize(newValue as Grid.ItemSize);
            setIsLoading(false);
          }}
        >
          <Grid.Dropdown.Item title="Large" value={Grid.ItemSize.Large} />
          <Grid.Dropdown.Item title="Medium" value={Grid.ItemSize.Medium} />
          <Grid.Dropdown.Item title="Small" value={Grid.ItemSize.Small} />
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
