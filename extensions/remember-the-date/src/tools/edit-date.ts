import { getItems, saveItems } from "../storage";
import { Item } from "../types";
import { refreshCommands } from "../utils";

type EditDateInput = {
  /**
   * The ID of the date to edit
   */
  id: string;
  /**
   * The new name of the date
   */
  name?: string;
  /**
   * The new description or subtitle
   */
  subtitle?: string;
  /**
   * The new date in YYYY-MM-DD format
   */
  date?: string;
};

/**
 * Edit an existing remembered date
 */
export default async function editDate(input: EditDateInput) {
  const items = await getItems();
  const itemIndex = items.findIndex((item) => item.id === input.id);

  if (itemIndex === -1) {
    return {
      success: false,
      message: `Date with ID "${input.id}" not found.`,
    };
  }

  const originalItem = items[itemIndex];
  const updatedItem: Item = {
    ...originalItem,
    name: input.name ?? originalItem.name,
    subtitle: input.subtitle ?? originalItem.subtitle,
    date: input.date ?? originalItem.date,
  };

  items[itemIndex] = updatedItem;
  await saveItems(items);
  await refreshCommands();

  return {
    success: true,
    message: `Updated "${updatedItem.name}"${input.date ? ` to ${input.date}` : ""}${input.name ? ` name to "${input.name}"` : ""}${input.subtitle !== undefined ? ` description to "${input.subtitle}"` : ""}`,
  };
}
