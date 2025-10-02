import { getChats } from "../api/get-chats";

type Input = {
  /**
   * The search term to search for in the contacts list. To optimize your chances of getting results, you can include more terms by separating them with spaces.
   */
  searchTerm: string;
};

export default async function (input: Input) {
  try {
<<<<<<< HEAD
    const preferences = getPreferenceValues();
    const contacts = await getChats(
      input.searchTerm,
      preferences.filterSpam ?? false,
      preferences.filterUnknownSenders ?? false,
    );
=======
    const contacts = await getChats(input.searchTerm);
>>>>>>> contributions/merge-1759445057133

    if (contacts.length === 0) {
      return "No contacts were found.";
    }

    return contacts;
  } catch (error) {
    if (error instanceof Error && error.message.includes("database")) {
      return "The user can't access the chat database";
    }

    return "An error occurred while searching for chats";
  }
}
