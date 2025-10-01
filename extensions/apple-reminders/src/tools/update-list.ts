import { updateList } from "swift:../../swift/AppleReminders";

type Input = {
  /**
   * The ID of the list to update. REQUIRED parameter.
   */
  listId: string;
  /**
   * The new name for the list (e.g., "Work", "Personal", "Shopping"). If not provided, the title will not be changed.
   */
  title?: string;
  /**
   * The new color for the list as a hex code. Pick from: "#FF3B30" (red), "#FF9500" (orange), "#FFCC00" (yellow), "#34C759" (green), "#007AFF" (blue), "#AF52DE" (purple), "#FF2D55" (magenta), "#A2845E" (brown), "#8E8E93" (gray). If not provided, the color will not be changed.
   */
  color?: string;
};

export default async function (input: Input) {
  // Validate that listId is provided
  if (!input || !input.listId || typeof input.listId !== "string" || input.listId.trim() === "") {
    throw new Error(
      "The 'listId' parameter is required and must be a non-empty string. Please provide the ID of the list to update.",
    );
  }

  // Validate that at least one field is being updated
  if (!input.title && !input.color) {
    throw new Error("At least one of 'title' or 'color' must be provided to update the list.");
  }

  const list = await updateList(input);
  return list;
}
