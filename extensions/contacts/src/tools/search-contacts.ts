import { searchContacts } from "swift:../../swift";
import { Contact, ErrorResponse } from "../types";

type SearchInput = {
  /**
   * The name or part of the name to search for
   */
  query: string;
};

/**
 * Searches for contacts in Apple Contacts
 * @param input Search query for finding contacts
 * @returns A list of matching contacts with their details
 */
export default async function searchContactsTool(input: SearchInput) {
  try {
    // Validate input
    if (!input.query || input.query.trim() === "") {
      return "Please provide a search query to find contacts.";
    }

    // Call Swift function to search contacts
    const result = await searchContacts(input.query);

    try {
      const response = JSON.parse(result);

      // Check if response is an error
      if ((response as ErrorResponse).error) {
        const errorResponse = response as ErrorResponse;
        return `Error: ${errorResponse.message}`;
      }

      // It's a successful response with contacts
      const contacts = response as Contact[];

      if (contacts.length === 0) {
        return `No contacts found matching "${input.query}". Try checking the spelling or using a different search term.`;
      }

      // Format the response
      let output = `Found ${contacts.length} contact(s) matching "${input.query}":\n\n`;

      contacts.forEach((contact, index) => {
        const name = `${contact.givenName} ${contact.familyName}`.trim() || "No Name";
        output += `${index + 1}. ${name}\n`;

        if (contact.emails && contact.emails.length > 0) {
          output += `   Email: ${contact.emails[0]}\n`;
        }

        if (contact.phones && contact.phones.length > 0) {
          output += `   Phone: ${contact.phones[0]}\n`;
        }

        output += "\n";
      });

      return output.trim();
    } catch (e) {
      return `Error parsing contacts: ${e}`;
    }
  } catch (e) {
    return `Error searching contacts: ${e}`;
  }
}
