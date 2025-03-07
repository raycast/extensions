import { deleteContact } from "swift:../../swift";
import { Tool } from "@raycast/api";

type DeleteInput = {
  /**
   * The ID of the contact to delete
   */
  id: string;
};

export const confirmation: Tool.Confirmation<DeleteInput> = async () => {
  return {
    title: "Delete Contact",
    message: `Are you sure you want to delete this contact?`,
    confirmButtonTitle: "Delete",
    cancelButtonTitle: "Cancel",
    icon: "trash-fill",
  };
};

/**
 * Deletes a contact from Apple Contacts
 * @param input The ID of the contact to delete
 * @returns A success message or error message
 */
export default async function deleteContactTool(input: DeleteInput) {
  try {
    // Validate input
    if (!input.id) {
      return "Error: Please provide a contact ID to delete.";
    }

    // Call Swift function to delete contact
    const responseJson = await deleteContact(input.id);
    const response = JSON.parse(responseJson);

    if (response.error) {
      return `Error deleting contact: ${response.message}`;
    }

    return `Successfully deleted the contact.`;
  } catch (error) {
    return `Error deleting contact: ${String(error)}`;
  }
}
