import { useState } from "react";
import { ActionPanel, Grid } from "@raycast/api";
import { Wallpapers } from "./types";
import { ActionCopyWallpaper, ActionPreviewWallpaper, ActionSetWallpaper } from "./components/Actions";

const wallpapers: Wallpapers = {
  windows: {
    name: "Windows",
    items: [
      { name: "Light", path: "wallpapers/windows/light_1920x1200.jpg" },
      { name: "Dark", path: "wallpapers/windows/dark_1920x1200.jpg" },
    ],
  },
  zoomed: {
    name: "Zoomed",
    items: [
      { name: "Windows Zoomed", path: "wallpapers/screen/windows_zoomed_3840x2400.jpg" },
      { name: "Captured Motion 3 Zoomed", path: "wallpapers/screen/captured_motion_3_zoomed_3839x2400.jpg" },
      { name: "Flow 1 Zoomed", path: "wallpapers/screen/flow_1_zoomed_3840x2400.jpg" },
    ],
  },
  touchKeyboard: {
    name: "Touch Keyboard",
    items: [
      { name: "1 - Light", path: "wallpapers/touch-keyboard/touch_keyboard_1_light_2736x1539.jpg" },
      { name: "1 - Dark", path: "wallpapers/touch-keyboard/touch_keyboard_1_dark_2736x1539.jpg" },
      { name: "2 - Light", path: "wallpapers/touch-keyboard/touch_keyboard_2_light_2736x1539.jpg" },
      { name: "2 - Dark", path: "wallpapers/touch-keyboard/touch_keyboard_2_dark_2736x1539.jpg" },
      { name: "3 - Light", path: "wallpapers/touch-keyboard/touch_keyboard_3_light_2736x1539.jpg" },
      { name: "3 - Dark", path: "wallpapers/touch-keyboard/touch_keyboard_3_dark_2736x1539.jpg" },
      { name: "4 - Light", path: "wallpapers/touch-keyboard/touch_keyboard_4_light_2736x1539.jpg" },
      { name: "4 - Dark", path: "wallpapers/touch-keyboard/touch_keyboard_4_dark_2736x1539.jpg" },
    ],
  },
  capturedMotion: {
    name: "Captured Motion",
    items: [
      { name: "1", path: "wallpapers/captured-motion/captured_motion_1_3840x2401.jpg" },
      { name: "2", path: "wallpapers/captured-motion/captured_motion_2_3840x2400.jpg" },
      { name: "3", path: "wallpapers/captured-motion/captured_motion_3_3840x2400.jpg" },
      { name: "4", path: "wallpapers/captured-motion/captured_motion_4_3840x2400.jpg" },
    ],
  },
  flow: {
    name: "Flow",
    items: [
      { name: "1", path: "wallpapers/flow/flow_1_3841x2400.jpg" },
      { name: "2", path: "wallpapers/flow/flow_2_3841x2400.jpg" },
      { name: "3", path: "wallpapers/flow/flow_3_3840x2400.jpg" },
      { name: "4", path: "wallpapers/flow/flow_4_3840x2400.jpg" },
    ],
  },
  glow: {
    name: "Glow",
    items: [
      { name: "1", path: "wallpapers/glow/glow_1_3840x2400.jpg" },
      { name: "2", path: "wallpapers/glow/glow_2_3840x2400.jpg" },
      { name: "3", path: "wallpapers/glow/glow_3_3840x2400.jpg" },
      { name: "4", path: "wallpapers/glow/glow_4_3840x2400.jpg" },
    ],
  },
  sunrise: {
    name: "Sunrise",
    items: [
      { name: "1", path: "wallpapers/sunrise/sunrise_1_3840x2400.jpg" },
      { name: "2", path: "wallpapers/sunrise/sunrise_2_3840x2400.jpg" },
      { name: "3", path: "wallpapers/sunrise/sunrise_3_3840x2400.jpg" },
      { name: "4", path: "wallpapers/sunrise/sunrise_4_3840x2400.jpg" },
      { name: "1 - Sunset", path: "wallpapers/sunrise/sunset_1_6400x4000.jpg" },
    ],
  },
};

export default function Command() {
  const [columns, setColumns] = useState(3);

  return (
    <Grid
      columns={columns}
      aspectRatio="16/9"
      fit={Grid.Fit.Fill}
      searchBarAccessory={
        <Grid.Dropdown
          tooltip="Grid Columns"
          storeValue
          onChange={(newValue) => {
            setColumns(parseInt(newValue));
          }}
        >
          <Grid.Dropdown.Item title="Large" value={"2"} />
          <Grid.Dropdown.Item title="Medium" value={"3"} />
          <Grid.Dropdown.Item title="Small" value={"4"} />
        </Grid.Dropdown>
      }
    >
      {Object.entries(wallpapers).map(([, group]) => (
        <Grid.Section key={group.name} title={group.name}>
          {group.items.map((item: { name: string; path: string }) => (
            <Grid.Item
              key={item.name}
              title={item.name}
              content={{ source: item.path }}
              actions={
                <ActionPanel>
                  <ActionSetWallpaper itemPath={item.path} />
                  <ActionCopyWallpaper itemPath={item.path} />
                  <ActionPreviewWallpaper itemPath={item.path} />
                </ActionPanel>
              }
            />
          ))}
        </Grid.Section>
      ))}
    </Grid>
  );
}
