import { confirmAlert, showToast, Toast } from "@raycast/api";
import { useCallback } from "react";
import { ManagePaletteActions, PaletteFormFields, SavedPalette } from "../types";

type UsePaletteActionsReturn = {
  paletteActions: ManagePaletteActions;
};

/**
 * Provides palette management actions: copy, edit, duplicate, delete.
 */
export function usePaletteActions(
  colorPalettes: SavedPalette[] | undefined,
  setColorPalettes: (palettes: SavedPalette[]) => Promise<void>,
): UsePaletteActionsReturn {
  const deletePalette = useCallback(
    async (paletteId: string, paletteName: string) => {
      try {
        // Request user confirmation before deletion
        const confirmed = await confirmAlert({
          title: "Delete Color Palette",
          message: `Are you sure you want to delete "${paletteName}"? This action cannot be undone.`,
          primaryAction: {
            title: "Delete",
          },
          dismissAction: {
            title: "Cancel",
          },
        });

        if (!confirmed) return;

        // Find the palette to verify it exists
        const paletteToDelete = colorPalettes?.find((p) => p.id === paletteId);
        if (!paletteToDelete) {
          showToast({
            style: Toast.Style.Failure,
            title: "Error.",
            message: "Palette not found or already deleted.",
          });
          return;
        }

        // Perform deletion
        const updatedPalettes = colorPalettes ? colorPalettes.filter((palette) => palette.id !== paletteId) : [];
        await setColorPalettes(updatedPalettes);

        showToast({
          style: Toast.Style.Success,
          title: "Palette Deleted.",
          message: `"${paletteName}" has been deleted.`,
        });
      } catch (error) {
        console.error("Error deleting palette:", error);
        showToast({
          style: Toast.Style.Failure,
          title: "Deletion Failed.",
          message: `Failed to delete "${paletteName}". Please try again.`,
        });
      }
    },
    [colorPalettes, setColorPalettes],
  );

  const createEdit = useCallback((palette: SavedPalette): PaletteFormFields => {
    const formData: Partial<PaletteFormFields> = {
      name: palette.name,
      description: palette.description,
      mode: palette.mode,
      keywords: palette.keywords || [],
      editId: palette.id, // This tells the form to overwrite instead of create new
    };

    // Add color fields with proper typing
    palette.colors.forEach((color, index) => {
      const colorKey = `color${index + 1}` as const;
      (formData as Record<string, unknown>)[colorKey] = color;
    });

    return formData as PaletteFormFields;
  }, []);

  const duplicate = useCallback(
    async (palette: SavedPalette) => {
      try {
        // Create a new palette with a unique ID and modified name
        const duplicatedPalette: SavedPalette = {
          ...palette,
          id: Date.now().toString(), // Generate new unique ID
          name: `${palette.name} Copy`, // Add "Copy" suffix to distinguish
          createdAt: new Date().toISOString(), // Set new creation date
        };

        // Add the duplicated palette to the list
        const updatedPalettes = colorPalettes ? [...colorPalettes, duplicatedPalette] : [duplicatedPalette];
        await setColorPalettes(updatedPalettes);

        showToast({
          style: Toast.Style.Success,
          title: "Palette Duplicated.",
          message: `"${duplicatedPalette.name}" has been created.`,
        });
      } catch (error) {
        console.error("Error duplicating palette:", error);
        showToast({
          style: Toast.Style.Failure,
          title: "Duplication Failed.",
          message: `Failed to duplicate "${palette.name}". Please try again.`,
        });
      }
    },
    [colorPalettes, setColorPalettes],
  );

  return {
    paletteActions: { delete: deletePalette, createEdit, duplicate },
  };
}
