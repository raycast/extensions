import { getItems, saveItems } from "../storage";
import { refreshCommands } from "../utils";

type DeleteDateInput = {
  /**
   * The ID of the date to delete
   */
  id: string;
};

/**
 * Delete a remembered date by ID
 */
export default async function deleteDate(input: DeleteDateInput) {
  const items = await getItems();
  const itemToDelete = items.find((item) => item.id === input.id);

  if (!itemToDelete) {
    return {
      success: false,
      message: `Date with ID "${input.id}" not found.`,
    };
  }

  const updatedItems = items.filter((item) => item.id !== input.id);
  await saveItems(updatedItems);
  await refreshCommands();

  return {
    success: true,
    message: `Deleted "${itemToDelete.name}" from your remembered dates.`,
  };
}
