import { launchCommand, LaunchType, showToast, Toast, useNavigation } from "@raycast/api";
import { useLocalStorage } from "@raycast/utils";
import { randomUUID } from "node:crypto";
import { PaletteFormFields, SavedPalette } from "../types";
import { extractColorValues } from "../utils/extractColorValues";

type UseFormSubmissionReturn = {
  submitPalette: (params: {
    formValues: PaletteFormFields;
    colorCount: number;
    onSubmit: () => void;
    isNestedContext?: boolean;
    onPaletteUpdated?: (palettes: SavedPalette[]) => Promise<void> | void;
  }) => Promise<void>;
};

/**
 * Custom hook for handling palette creation and editing with storage management.
 * Manages both new palette creation and existing palette updates with proper error handling.
 */
export function useFormSubmission(): UseFormSubmissionReturn {
  const { pop } = useNavigation();

  // Access local storage "color-palettes-list", shared across the extension
  const { value: storedPalettes, setValue: setStoredPalettes } = useLocalStorage<SavedPalette[]>(
    "color-palettes-list",
    [],
  );

  /**
   * Saves or updates a color palette in local storage with comprehensive error handling.
   * Handles both creation of new palettes and editing of existing ones.
   */
  const submitPalette = async ({
    formValues,
    colorCount,
    onSubmit,
    isNestedContext = false,
    onPaletteUpdated,
  }: {
    formValues: PaletteFormFields;
    colorCount: number;
    onSubmit: () => void;
    isNestedContext?: boolean;
    onPaletteUpdated?: (palettes: SavedPalette[]) => Promise<void> | void;
  }) => {
    try {
      // Extract color values from form data
      const colorValues = extractColorValues(formValues, colorCount);

      // Check if we're editing an existing palette
      if (formValues.editId) {
        // UPDATE EXISTING PALETTE
        // First, verify the palette exists
        const existingPalette = (storedPalettes ?? []).find((p) => p.id === formValues.editId);
        if (!existingPalette) {
          showToast({
            style: Toast.Style.Failure,
            title: "Palette Not Found",
            message: "It may have been deleted.",
          });
          return;
        }

        const updatedPalettes = (storedPalettes ?? []).map((palette) => {
          if (palette.id === formValues.editId) {
            return {
              ...palette,
              name: formValues.name,
              description: formValues.description,
              mode: formValues.mode as "light" | "dark",
              keywords: formValues.keywords || [],
              colors: colorValues,
              // Keep original ID and createdAt
            };
          }
          return palette;
        });

        await setStoredPalettes(updatedPalettes);

        // Sync the parent (Manage Color Palettes) so its in-memory list reflects
        // the change immediately — useLocalStorage instances do not subscribe
        // across views, so without this the popped-to view would be stale.
        if (onPaletteUpdated) {
          await onPaletteUpdated(updatedPalettes);
        }

        showToast({
          style: Toast.Style.Success,
          title: "Palette Updated",
          message: formValues.name,
        });

        pop();
        return;
      } else {
        // CREATE NEW PALETTE
        const palette: SavedPalette = {
          id: randomUUID(),
          name: formValues.name,
          description: formValues.description,
          mode: formValues.mode as "light" | "dark",
          keywords: formValues.keywords || [],
          colors: colorValues,
          createdAt: new Date().toISOString(),
        };

        // Prepend new palette to maintain chronological order (newest first)
        const updatedPalettes = [palette, ...(storedPalettes ?? [])];
        await setStoredPalettes(updatedPalettes);

        showToast({
          style: Toast.Style.Success,
          title: "Palette Saved",
          message: formValues.name,
        });
      }

      // For creating new palettes: Cleanup form first
      onSubmit();

      if (!isNestedContext) {
        try {
          await launchCommand({
            name: "manage-color-palettes",
            type: LaunchType.UserInitiated,
          });
        } catch (navErr) {
          console.warn("navigation to Manage Color Palettes failed", navErr);
        }
      }
    } catch (err) {
      console.error("submitPalette failed", err);
      showToast({
        style: Toast.Style.Failure,
        title: "Save Failed",
        message: "Could not save the color palette.",
      });
    }
  };

  return {
    submitPalette,
  };
}
