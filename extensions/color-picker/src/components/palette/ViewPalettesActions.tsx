import { Action, ActionPanel, Icon, LaunchType } from "@raycast/api";
import SaveColorPaletteCommand from "../../save-color-palette";
import { CopyPaletteFormat, ManagePaletteActions, SavedPalette } from "../../types";
import { copyPalette } from "../../utils/copyPalette";
import { isValidHexColor } from "../../utils/isValidHexColor";

interface ViewPalettesActionsProps {
  palette: SavedPalette;
  paletteActions: ManagePaletteActions;
}

/**
 * Copy format configurations with format-specific icons.
 */
const COPY_FORMATS: Array<{
  format: CopyPaletteFormat;
  title: string;
  icon: Icon;
}> = [
  { format: "json", title: "Copy Colors as JSON", icon: Icon.CodeBlock },
  { format: "css", title: "Copy Colors as CSS Classes", icon: Icon.Brush },
  { format: "css-variables", title: "Copy Colors as CSS Variables", icon: Icon.Gear },
  { format: "txt", title: "Copy Colors as Plain Text", icon: Icon.Text },
];

/**
 * Generates Coolors.co URL from palette colors with validation.
 */
const generateCoolorsUrl = (colors: string[]): string => {
  try {
    const colorCodes = colors
      .filter(isValidHexColor) // Validate hex format
      .map((color) => color.replace(/^#/, "")) // Remove # prefix for URL
      .join("-");

    return colorCodes ? `https://coolors.co/${colorCodes}` : "https://coolors.co/";
  } catch {
    return "https://coolors.co/";
  }
};

export function ViewPalettesActions({ palette, paletteActions }: ViewPalettesActionsProps) {
  return (
    <ActionPanel>
      <ActionPanel.Submenu title="Copy Palette Colors" icon={Icon.CopyClipboard}>
        {COPY_FORMATS.map(({ format, title, icon }) => (
          <Action.CopyToClipboard key={format} title={title} content={copyPalette(palette, format)} icon={icon} />
        ))}
        <ActionPanel.Section title="Copy Individual Colors">
          {palette.colors.map((color, idx) => (
            <Action.CopyToClipboard
              key={`${color}-${idx}`}
              title={`Copy Color ${idx + 1} - ${color}`}
              content={color}
            />
          ))}
        </ActionPanel.Section>
      </ActionPanel.Submenu>

      <Action.OpenInBrowser
        title="Open in Coolors"
        url={generateCoolorsUrl(palette.colors)}
        icon={Icon.Globe}
        shortcut={{ modifiers: ["cmd"], key: "o" }}
      />

      <Action.Push
        title="Edit Palette"
        target={
          <SaveColorPaletteCommand
            launchType={LaunchType.UserInitiated}
            arguments={{}}
            draftValues={paletteActions.createEdit(palette)}
          />
        }
        icon={Icon.Pencil}
        shortcut={{ modifiers: ["cmd"], key: "e" }}
      />

      <Action
        title="Duplicate Palette"
        onAction={() => paletteActions.duplicate(palette)}
        icon={Icon.Duplicate}
        shortcut={{ modifiers: ["cmd"], key: "d" }}
      />

      <Action
        title="Delete Palette"
        onAction={() => paletteActions.delete(palette.id, palette.name)}
        icon={Icon.Trash}
        style={Action.Style.Destructive}
        shortcut={{ modifiers: ["cmd", "shift"], key: "backspace" }}
      />
    </ActionPanel>
  );
}
