import { searchContacts } from "swift:../../swift";
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
    const responseJson = await searchContacts(input.query);
    const response = JSON.parse(responseJson);

    // Check for errors
    if (response.error) {
      return `Error searching contacts: ${response.message}`;
    }

    // Format results
    const contacts = response as Array<{
      id: string;
      givenName: string;
      familyName: string;
      emails: string[];
      phones: string[];
    }>;

    if (contacts.length === 0) {
      return `No contacts found matching "${input.query}".`;
    }

    // Format the results
    let result = `Found ${contacts.length} contact(s) matching "${input.query}":\n\n`;

    contacts.forEach((contact, index) => {
      const name = [contact.givenName, contact.familyName].filter(Boolean).join(" ") || "No Name";
      result += `${index + 1}. ${name}\n`;

      if (contact.emails && contact.emails.length > 0) {
        result += `   Email: ${contact.emails[0]}\n`;
      }

      if (contact.phones && contact.phones.length > 0) {
        result += `   Phone: ${contact.phones[0]}\n`;
      }

      result += "\n";
    });

    return result.trim();
  } catch (error) {
    return `Error searching contacts: ${String(error)}`;
  }
}
