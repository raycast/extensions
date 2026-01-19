/**
 * Constants for the Messages extension
 */

/**
 * Values for the `is_filtered` column in the chat.db database (macOS 26+)
 *
 * This column indicates the filtering status applied by the Messages app.
 * On older macOS versions, this column may not exist and queries should handle it gracefully.
 */
export const MessageFilterStatus = {
  /**
   * Messages from senders not in the user's contacts (Unknown Senders)
   */
  UNKNOWN_SENDER: 1,

  /**
   * Messages marked as spam by the system or user
   */
  SPAM: 2,
} as const;
