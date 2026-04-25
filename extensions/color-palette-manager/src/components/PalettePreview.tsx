import { Action, ActionPanel, Grid, Icon } from "@raycast/api";
import { COPY_FORMATS, SHORTCUTS } from "../constants";
import { SavedPalette } from "../types";
import { copyPalette } from "../utils/copyPalette";

interface PalettePreviewProps {
  palette: SavedPalette;
}

export function PalettePreview({ palette }: PalettePreviewProps) {
  return (
    <Grid navigationTitle="Color Palette Preview">
      {palette.colors.map((color, index) => (
        <Grid.Item
          key={`${color}-${index}`}
          content={{ color }}
          title={`Color ${index + 1}`}
          subtitle={color}
          actions={
            <ActionPanel>
              <Action.CopyToClipboard title={`Copy Color ${index + 1} - ${color}`} content={color} />
              <ActionPanel.Submenu
                title="Copy Palette Colors"
                icon={Icon.CopyClipboard}
                shortcut={SHORTCUTS.COPY_PALETTE}
              >
                {COPY_FORMATS.map(({ format, title, icon }) => (
                  <Action.CopyToClipboard
                    key={format}
                    title={title}
                    content={copyPalette(palette, format)}
                    icon={icon}
                  />
                ))}
              </ActionPanel.Submenu>
            </ActionPanel>
          }
        />
      ))}
    </Grid>
  );
}
