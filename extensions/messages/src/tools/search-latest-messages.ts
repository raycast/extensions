import { getPreferenceValues } from "@raycast/api";

import { getMessages } from "../api/get-messages";

interface Preferences {
  filterUnknownSenders?: boolean;
  filterSpam?: boolean;
}

type Input = {
  /**
   * The search text to search for in the messages list.
   */
  searchText: string;
  /**
   * Optional chat identifier to filter messages from a specific chat. You can find this by using the search-chats tool.
   * Example: "+1234567890" for SMS or "iMessage;-;email@example.com" for iMessage
   */
  chatIdentifier?: string;
};

export default async function (input: Input) {
  const preferences = getPreferenceValues<Preferences>();
  const messages = await getMessages(
    input.searchText,
    input.chatIdentifier,
    preferences.filterSpam ?? false,
    preferences.filterUnknownSenders ?? false,
  );
  return messages;
}
