import { createList } from "swift:../../swift/AppleReminders";

type Input = {
  /**
   * The name of the list (e.g., "Work", "Personal", "Shopping"). This parameter is REQUIRED and must be a non-empty string.
   */
  title: string;
  /**
   * The color for the list as a hex code. Pick from: "#FF3B30" (red), "#FF9500" (orange), "#FFCC00" (yellow), "#34C759" (green), "#007AFF" (blue), "#AF52DE" (purple), "#FF2D55" (magenta), "#A2845E" (brown), "#8E8E93" (gray). If not specified, defaults to blue.
   */
  color?: string;
};

export default async function (input: Input) {
  // Validate that title is provided and not empty
  if (!input || !input.title || typeof input.title !== "string" || input.title.trim() === "") {
    throw new Error("The 'title' parameter is required and must be a non-empty string. Please provide a name for the list.");
  }

  const list = await createList(input);
  return list;
}