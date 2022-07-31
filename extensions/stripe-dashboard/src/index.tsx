import { useState } from "react";
import { ActionPanel, Action, Grid } from "@raycast/api";
import { navItems } from "./navigation";
import { Environment } from "./types";

export default function Command() {
  const [environment, setEnvironment] = useState<Environment>("live");
  return (
    <Grid
      itemSize={Grid.ItemSize.Medium}
      inset={Grid.Inset.Large}
      searchBarAccessory={
        <Grid.Dropdown
          tooltip="Environment"
          storeValue
          onChange={(newValue) => {
            setEnvironment(newValue as Environment);
          }}
        >
          <Grid.Dropdown.Item title="Live" value="live" />
          <Grid.Dropdown.Item title="Test" value="test" />
        </Grid.Dropdown>
      }
    >
      {navItems.map(({ label, icon, Page, iconColor = "" }) => (
        <Grid.Item
          key={label}
          content={{ value: { source: icon, tintColor: iconColor }, tooltip: label }}
          title={label}
          actions={
            <ActionPanel>
              <Action.Push title={`Open ${label}`} target={<Page environment={environment} />} />
            </ActionPanel>
          }
        />
      ))}
    </Grid>
  );
}
