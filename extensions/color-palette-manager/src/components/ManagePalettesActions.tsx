import { Action, ActionPanel, Icon, LaunchType } from "@raycast/api";
import { SHORTCUTS } from "../constants";
import SaveColorPaletteCommand from "../save-color-palette";
import { ManagePaletteActions, SavedPalette } from "../types";
import { isValidHexColor } from "../utils/isValidHexColor";
import { PalettePreview } from "./PalettePreview";

interface ManagePalettesActionsProps {
  palette: SavedPalette;
  paletteActions: ManagePaletteActions;
  /** Setter from Manage Color Palettes' useLocalStorage instance, used to keep its in-memory state in sync after an edit. */
  onPaletteUpdated: (palettes: SavedPalette[]) => Promise<void>;
}

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

export function ManagePalettesActions({ palette, paletteActions, onPaletteUpdated }: ManagePalettesActionsProps) {
  const coolorsUrl = generateCoolorsUrl(palette.colors);
  return (
    <ActionPanel>
      <Action.Push
        icon={Icon.Swatch}
        title="Preview Palette"
        target={<PalettePreview palette={palette} />}
        shortcut={SHORTCUTS.PREVIEW_PALETTE}
      />

      <Action.Push
        title="Edit Palette"
        target={
          <SaveColorPaletteCommand
            launchType={LaunchType.UserInitiated}
            arguments={{}}
            draftValues={paletteActions.createEdit(palette)}
            onPaletteUpdated={onPaletteUpdated}
          />
        }
        icon={Icon.Pencil}
        shortcut={SHORTCUTS.EDIT_PALETTE}
      />

      <Action
        title="Duplicate Palette"
        onAction={() => paletteActions.duplicate(palette)}
        icon={Icon.Duplicate}
        shortcut={SHORTCUTS.DUPLICATE_PALETTE}
      />

      <Action.CopyToClipboard
        title="Copy Link to Coolors.co"
        content={coolorsUrl}
        icon={Icon.Repeat}
        shortcut={SHORTCUTS.COPY_COOLORS_LINK}
      />

      <Action
        title="Delete Palette"
        onAction={() => paletteActions.delete(palette.id, palette.name)}
        icon={Icon.Trash}
        style={Action.Style.Destructive}
        shortcut={SHORTCUTS.DELETE_PALETTE}
      />
    </ActionPanel>
  );
}
