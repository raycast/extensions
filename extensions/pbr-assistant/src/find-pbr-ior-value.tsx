import { Action, ActionPanel, List, Grid, Icon } from "@raycast/api";
import React, { useState } from "react";
import { IOR_VALUES, PBR_COLORS } from "./data";

export default function Command() {
  const [category, setCategory] = useState<"ior" | "color">("color");

  if (category === "ior") {
    return (
      <List
        searchBarPlaceholder="Search IOR values..."
        searchBarAccessory={
          <List.Dropdown
            tooltip="Select Category"
            value={category}
            onChange={(newValue) => setCategory(newValue as "ior" | "color")}
          >
            <List.Dropdown.Item title="PBR Diffuse Colors" value="color" icon={Icon.Brush} />
            <List.Dropdown.Item title="IOR Values" value="ior" icon={Icon.Globe} />
          </List.Dropdown>
        }
      >
        {IOR_VALUES.map((item) => (
          <List.Item
            key={item.name}
            title={item.name}
            subtitle={item.value}
            actions={
              <ActionPanel>
                <Action.CopyToClipboard content={item.value} title="Copy to Clipboard" />
                <Action.Paste content={item.value} title="Paste" />
              </ActionPanel>
            }
          />
        ))}
      </List>
    );
  }

  return (
    <Grid
      searchBarPlaceholder="Search PBR colors..."
      aspectRatio="1"
      searchBarAccessory={
        <Grid.Dropdown
          tooltip="Select Category"
          value={category}
          onChange={(newValue) => setCategory(newValue as "ior" | "color")}
        >
          <Grid.Dropdown.Item title="PBR Diffuse Colors" value="color" icon={Icon.Brush} />
          <Grid.Dropdown.Item title="IOR Values" value="ior" icon={Icon.Globe} />
        </Grid.Dropdown>
      }
    >
      {PBR_COLORS.map((item) => (
        <Grid.Item
          key={item.name}
          title={item.name}
          subtitle={item.value}
          content={{
            source: Icon.CircleFilled,
            tintColor: item.value,
          }}
          actions={
            <ActionPanel>
              <Action.CopyToClipboard content={item.value} title="Copy Hex" />
              <Action.Paste content={item.value} title="Paste Hex" />
              {item.srgb && (
                <>
                  <Action.CopyToClipboard
                    content={item.srgb}
                    title="Copy SRGB"
                    shortcut={{ modifiers: ["opt"], key: "c" }}
                  />
                  <Action.Paste content={item.srgb} title="Paste SRGB" shortcut={{ modifiers: ["opt"], key: "v" }} />
                </>
              )}
            </ActionPanel>
          }
        />
      ))}
    </Grid>
  );
}
