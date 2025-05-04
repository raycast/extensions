import { AI, Tool } from "@raycast/api";
import { contactService } from "../services/contactService";

type Input = {
  /**
   * The contact description to search for
   */
  query: string;
};

export const confirmation: Tool.Confirmation<Input> = async (input) => {
  return {
    message: `Are you sure you want to search for "${input.query}"?`,
  };
};

/**
 * Use AI to search WeChat contacts
 */
export default async function tool(input: Input) {
  // Use AI to extract search intent and conditions
  const response = await AI.ask(`
    Analyze the following WeChat contact search query and extract search conditions and keywords.
    
    Query: "${input.query}"
    
    If searching for a surname, return format: {"type": "surname", "value": "surname"}
    If searching for names containing specific characters, return format: {"type": "contains", "value": "characters"}
    If searching for names of a specific length, return format: {"type": "length", "value": number}
    If it's another search condition, return format: {"type": "keyword", "value": "keyword"}
    If search intent cannot be recognized, return: {"type": "unknown"}
    
    Return only JSON format, don't add any other text.
  `);

  try {
    // Parse the JSON returned by AI
    const searchIntent = JSON.parse(response.trim());

    // Create an AbortController to manage the fetch request lifecycle
    const controller = new AbortController();

    try {
      // Get all contacts with proper signal handling
      const allContacts = await contactService.searchContacts("", controller.signal);

      let filteredContacts = [];
      let searchDescription = "";

      // Execute different search logic based on the search type
      switch (searchIntent.type) {
        case "surname":
          // Search by surname
          filteredContacts = allContacts.filter((contact) => {
            return contact.title.startsWith(searchIntent.value);
          });
          searchDescription = `contacts with surname ${searchIntent.value}`;
          break;

        case "contains":
          // Search for names containing specific characters
          filteredContacts = allContacts.filter((contact) => {
            return contact.title.includes(searchIntent.value);
          });
          searchDescription = `contacts with names containing "${searchIntent.value}"`;
          break;

        case "length":
          // Search for names of a specific length
          filteredContacts = allContacts.filter((contact) => {
            // Remove non-Chinese characters and calculate length
            const chineseName = contact.title.replace(/[^\u4e00-\u9fa5]/g, "");
            const length = Number(searchIntent.value);
            return !isNaN(length) && chineseName.length === length;
          });
          searchDescription = `contacts with ${searchIntent.value} Chinese characters in name`;
          break;

        case "unknown":
          // Unrecognized search intent
          filteredContacts = allContacts.filter((contact) => {
            const lowerQuery = input.query.toLowerCase();
            return (
              contact.title.toLowerCase().includes(lowerQuery) ||
              contact.subtitle.toLowerCase().includes(lowerQuery) ||
              contact.arg.toLowerCase().includes(lowerQuery)
            );
          });
          searchDescription = `contacts containing "${input.query}"`;
          break;

        default:
          // Default keyword search
          filteredContacts = allContacts.filter((contact) => {
            const lowerValue = searchIntent.value.toLowerCase();
            return (
              contact.title.toLowerCase().includes(lowerValue) ||
              contact.subtitle.toLowerCase().includes(lowerValue) ||
              contact.arg.toLowerCase().includes(lowerValue)
            );
          });
          searchDescription = `contacts containing "${searchIntent.value}"`;
          break;
      }

      // Format search results
      if (filteredContacts.length === 0) {
        return `No ${searchDescription} found.`;
      }

      // Return search results
      return (
        `Found ${filteredContacts.length} ${searchDescription}:\n\n` +
        filteredContacts
          .map((contact, index) => {
            // Limit to displaying at most 15 results to avoid returning too much
            if (index < 15) {
              return `- ${contact.title} (${contact.arg})`;
            } else if (index === 15) {
              return `\n...and ${filteredContacts.length - 15} more contacts`;
            }
            return "";
          })
          .filter((line) => line !== "")
          .join("\n")
      );
    } finally {
      // Always abort the controller when done to clean up resources
      controller.abort();
    }
  } catch (error) {
    console.error("Search processing error:", error);
    return `Search failed: ${error instanceof Error ? error.message : String(error)}\n\nPlease try using more specific search criteria.`;
  }
}
