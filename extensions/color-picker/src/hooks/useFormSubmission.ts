import { launchCommand, LaunchType, popToRoot, showToast, Toast } from "@raycast/api";
import { useLocalStorage } from "@raycast/utils";
import { PaletteFormFields, SavedPalette } from "../types";
import { extractColorValues } from "../utils/extractColorValues";

type UseFormSubmissionReturn = {
  submitPalette: (params: {
    formValues: PaletteFormFields;
    colorCount: number;
    onSubmit: () => void;
    isNestedContext?: boolean;
  }) => Promise<void>;
};
/**
 * Custom hook for handling palette creation and editing with storage management.
 * Manages both new palette creation and existing palette updates with proper error handling.
 */
export function useFormSubmission(): UseFormSubmissionReturn {
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
  }: {
    formValues: PaletteFormFields;
    colorCount: number;
    onSubmit: () => void;
    isNestedContext?: boolean;
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
            title: "Error.",
            message: "Palette not found. It may have been deleted.",
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

        // Provide specific success feedback for edits
        showToast({
          style: Toast.Style.Success,
          title: `${formValues.name} palette updated.`,
          message: `You can now view it in the list`,
        });

        // For editing: Return to main Raycast interface
        await popToRoot();
        return;
      } else {
        // CREATE NEW PALETTE
        const palette: SavedPalette = {
          id: Date.now().toString(),
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

        // Provide detailed success feedback to user
        showToast({
          style: Toast.Style.Success,
          title: "Success!",
          message: `${formValues.name} palette created.`,
        });
      }

      // For creating new palettes: Cleanup form first
      onSubmit();

      // Navigate to view-palettes only if not in nested context (to prevent "Command cannot launch itself" error)
      if (!isNestedContext) {
        await launchCommand({
          name: "view-color-palettes",
          type: LaunchType.UserInitiated,
        });
      }
    } catch (error) {
      // Log error for debugging while showing user-friendly message
      console.error("Error saving palette:", error);
      showToast({
        style: Toast.Style.Failure,
        title: "Error.",
        message: "Failed to save color palette",
      });
    }
  };

  return {
    submitPalette,
  };
}
