import { FavoritableObject, NamedObject } from "../common/types";

/**
 * Wrapper type for the chat manager returned by {@link useChats}.
 */
export type ChatManager = {
  /**
   * The list of chats.
   */
  chats: Chat[];

  /**
   * Whether the chats are currently being loaded.
   */
  isLoading: boolean;

  /**
   * The error message, if any.
   */
  error: string | undefined;

  /**
   * Reloads the chats, ensuring that the latest version is loaded.
   * @returns A promise that resolves when the chats have been reloaded.
   */
  revalidate: () => Promise<void>;

  /**
   * Creates a new chat.
   * @param name The name of the chat.
   * @param basePrompt The base prompt for the chat.
   * @param options Any predefined settings for the chat.
   * @returns A promise that resolves to the newly created chat, or undefined if the chat could not be created.
   */
  createChat: (name: string, basePrompt: string, options: object) => Promise<Chat | undefined>;

  /**
   * Appends text to a chat conversation & updates the chat's file.
   * @param chat The chat to append to.
   * @param text The text to append.
   * @returns A promise that resolves when the text has been appended.
   */
  appendToChat: (chat: Chat, text: string) => Promise<void>;

  /**
   * Loads a chat's conversation from its file.
   * @param chatName The name of the chat to load.
   * @returns The chat's conversation, or undefined if the chat could not be found.
   */
  loadConversation: (chatName: string) => string[] | undefined;

  /**
   * Gets the list of favorited chats.
   * @returns The list of favorited chats.
   */
  favorites: () => Chat[];

  /**
   * Checks whether a chat currently exists (i.e. whether it has an associated file).
   * @param chat The chat to check.
   * @returns True if the chat exists, false otherwise.
   */
  checkExists: (chat: Chat) => boolean;

  /**
   * Updates the value of a single property in a chat's settings.
   * @param chat The chat to update.
   * @param property The name of the property to update.
   * @param value The new value of the property.
   * @returns A promise that resolves when the property has been updated.
   */
  setChatProperty: (chat: Chat, property: string, value: string | boolean) => Promise<void>;

  /**
   * Gets the contents of a chat's file.
   * @param chat The chat to get the contents of.
   * @returns The contents of the chat's file.
   */
  getChatContents: (chat: Chat) => string;

  /**
   * Calculates statistics for a chat.
   * @param chatName The name of the chat to calculate statistics for.
   * @returns The statistics for the chat.
   */
  calculateStats: (chatName: string) => ChatStatistics;
};

/**
 * A PromptLab Chat instance.
 */
export type Chat = NamedObject &
  FavoritableObject & {
    /**
     * The Raycast icon for the chat.
     */
    icon: string;

    /**
     * The Raycast color for the chat.
     */
    iconColor: string;

    /**
     * The base prompt for the chat, to always be kept included in the conversation context window.
     */
    basePrompt: string;

    /**
     * Data to be used as context for the conversation.
     */
    contextData: {
      /**
       * The type of context data.
       */
      type: string;

      /**
       * The source of the context data.
       */
      source: string;

      /**
       * The data itself.
       */
      data: string;
    }[];

    /**
     * How context data should be condensed.
     */
    condensingStrategy: string;

    /**
     * The maximum length of context data summaries.
     */
    summaryLength: string;

    /**
     * Calculated statistics for the chat.
     */
    stats?: ChatStatistics;

    /**
     * Whether to display the base prompt in the chat view.
     */
    showBasePrompt: boolean;

    /**
     * Whether to use the selected files as context data.
     */
    useSelectedFilesContext: boolean;

    /**
     * Whether to use the conversation history as context data.
     */
    useConversationContext: boolean;

    /**
     * Whether to let the AI run PromptLab commands autonomously.
     */
    allowAutonomy: boolean;
  };

/**
 * Statistics about a PromptLab chat.
 */
export type ChatStatistics = {
  totalQueries: string;
  totalResponses: string;
  totalPlaceholdersUsedByUser: string;
  totalCommandsRunByAI: string;
  mostCommonQueryWords: string[];
  mostCommonResponseWords: string[];
  totalLengthOfContextData: string;
  lengthOfBasePrompt: string;
  averageQueryLength: string;
  averageResponseLength: string;
  mostUsedPlaceholder: string;
  mostUsedCommand: string;
  mostUsedEmojis: string[];
};

export function isChat(obj: object): obj is Chat {
  return "condensingStrategy" in obj;
}
