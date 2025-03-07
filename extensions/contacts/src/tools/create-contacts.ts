import { createContact } from "swift:../../swift";
import { Tool } from "@raycast/api";

type ContactInput = {
  /**
   * The first name of the contact
   */
  firstName: string;

  /**
   * The last name of the contact
   */
  lastName?: string;

  /**
   * Email addresses for the contact
   * Format: [{ "address": "email@example.com", "label": "home|work|school|other" }]
   */
  emails?: Array<{ address: string; label: string }>;

  /**
   * Phone numbers for the contact
   * Format: [{ "number": "+1234567890", "label": "mobile|home|work|iphone|main" }]
   */
  phones?: Array<{ number: string; label: string }>;
};

export const confirmation: Tool.Confirmation<ContactInput> = async (input) => {
  const name = [input.firstName, input.lastName].filter(Boolean).join(" ");

  return {
    title: "Create Contact",
    message: `Are you sure you want to create a contact for ${name}?`,
    confirmButtonTitle: "Create",
    cancelButtonTitle: "Cancel",
    icon: "person-fill",
  };
};

/**
 * Creates a new contact in Apple Contacts
 * @param input Contact information including name, emails, and phone numbers
 * @returns A success message with the contact details
 */
export default async function createContactTool(input: ContactInput) {
  try {
    // Validate input
    if (!input.firstName && !input.lastName) {
      return "Error: Please provide at least a first name or last name for the contact.";
    }

    // Prepare contact data
    const contactData = {
      givenName: input.firstName || "",
      familyName: input.lastName || "",
      emails: input.emails || [],
      phones: input.phones || [],
    };

    // Call Swift function to create contact
    const jsonData = JSON.stringify(contactData);
    const responseJson = await createContact(jsonData);
    const response = JSON.parse(responseJson);

    if (response.error) {
      return `Error creating contact: ${response.message}`;
    }

    // Format success message
    const name = [input.firstName, input.lastName].filter(Boolean).join(" ");
    let details = "";

    if (input.emails && input.emails.length > 0) {
      details += `\nEmail: ${input.emails[0].address}`;
    }

    if (input.phones && input.phones.length > 0) {
      details += `\nPhone: ${input.phones[0].number}`;
    }

    return `Successfully created contact for ${name}.${details}`;
  } catch (error) {
    return `Error creating contact: ${String(error)}`;
  }
}
