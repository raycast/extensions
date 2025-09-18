import { Tool, Action } from "@raycast/api";
import * as google from "../api/oauth";
import { fetchContacts } from "../api/endpoints";
import { Contact } from "../types";
import { getPrimaryName, getPrimaryEmail, getPrimaryPhone } from "../utils";

// Define the input type for the search tool
type SearchContactsInput = {
  /**
   * The search query to find contacts
   * @example "John Smith"
   * @example "john@example.com"
   * @example "marketing team"
   */
  query: string;

  /**
   * Optional limit on number of results (defaults to 5)
   * @example 3
   * @example 10
   */
  limit?: number;
};

// Confirmation function to ask permission before searching
export const confirmation: Tool.Confirmation<SearchContactsInput> = async (input) => {
  return {
    message: `Search your Google Contacts for "${input.query}"?`,
    style: Action.Style.Regular,
    info: [
      {
        name: "Query",
        value: input.query,
      },
      {
        name: "Max Results",
        value: input.limit ? input.limit.toString() : "5 (default)",
      },
    ],
  };
};

// The actual search function
export default async function searchContacts(input: SearchContactsInput): Promise<string> {
  const query = input.query;
  const limit = input.limit || 5;

  try {
    // Authorize with Google
    await google.authorize();

    // Fetch all contacts (could be optimized if API supported direct search)
    const allContacts = await fetchContacts(1000);

    // Filter contacts based on the query
    const matchingContacts = allContacts.filter((contact) => {
      const name = getPrimaryName(contact).toLowerCase();
      const email = getPrimaryEmail(contact)?.toLowerCase() || "";
      const phone = getPrimaryPhone(contact)?.toLowerCase() || "";
      const organization = contact.organizations?.[0]?.name?.toLowerCase() || "";
      const title = contact.organizations?.[0]?.title?.toLowerCase() || "";

      const queryLower = query.toLowerCase();

      return (
        name.includes(queryLower) ||
        email.includes(queryLower) ||
        phone.includes(queryLower) ||
        organization.includes(queryLower) ||
        title.includes(queryLower)
      );
    });

    // Limit the number of results
    const limitedContacts = matchingContacts.slice(0, limit);

    if (limitedContacts.length === 0) {
      return `No contacts found matching "${query}".`;
    }

    // Format the results for AI response
    const resultText = formatContactsForAI(limitedContacts);
    return resultText;
  } catch (error) {
    console.error("Error searching contacts:", error);
    throw new Error(`Failed to search contacts: ${error}`);
  }
}

// Helper function to format contact details in a readable way for AI
function formatContactsForAI(contacts: Contact[]): string {
  let result = `Found ${contacts.length} contact${contacts.length > 1 ? "s" : ""}:\n\n`;

  contacts.forEach((contact, index) => {
    const name = getPrimaryName(contact);
    const email = getPrimaryEmail(contact);
    const phone = getPrimaryPhone(contact);
    const organization = contact.organizations?.[0]?.name;
    const title = contact.organizations?.[0]?.title;
    const birthday = contact.birthdays?.[0]?.date ? formatBirthday(contact.birthdays[0].date) : undefined;

    result += `${index + 1}. ${name}\n`;
    if (email) result += `   Email: ${email}\n`;
    if (phone) result += `   Phone: ${phone}\n`;
    if (organization) result += `   Company: ${organization}\n`;
    if (title) result += `   Position: ${title}\n`;
    if (birthday) result += `   Birthday: ${birthday}\n`;

    // Add additional emails
    if (contact.emailAddresses && contact.emailAddresses.length > 1) {
      contact.emailAddresses.slice(1).forEach((emailObj) => {
        if (emailObj.value && emailObj.value !== email) {
          const typeLabel = emailObj.type
            ? `${emailObj.type.charAt(0).toUpperCase() + emailObj.type.slice(1)} Email`
            : "Additional Email";
          result += `   ${typeLabel}: ${emailObj.value}\n`;
        }
      });
    }

    // Add additional phone numbers
    if (contact.phoneNumbers && contact.phoneNumbers.length > 1) {
      contact.phoneNumbers.slice(1).forEach((phoneObj) => {
        if (phoneObj.value && phoneObj.value !== phone) {
          const typeLabel = phoneObj.type
            ? `${phoneObj.type.charAt(0).toUpperCase() + phoneObj.type.slice(1)} Phone`
            : "Additional Phone";
          result += `   ${typeLabel}: ${phoneObj.value}\n`;
        }
      });
    }

    result += "\n";
  });

  return result;
}

// Format birthday in DD.MM.YYYY format
function formatBirthday(date: { year?: number; month?: number; day?: number }): string | undefined {
  if (!date.month || !date.day) return undefined;

  const day = date.day.toString().padStart(2, "0");
  const month = date.month.toString().padStart(2, "0");

  if (date.year) {
    return `${day}.${month}.${date.year}`;
  } else {
    return `${day}.${month}`;
  }
}
