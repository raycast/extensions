/**
 * iMessage handling module for 2FA code detection
 * Provides functionality to fetch and process 2FA codes from iMessage database
 */

import { homedir } from "os";
import { resolve } from "path";
import { useSQL } from "@raycast/utils";
import { Message, Preferences, SearchType } from "./types";
import { getPreferenceValues } from "@raycast/api";
import { calculateLookBackMinutes } from "./utils";

// Path to the iMessage database
const DB_PATH = resolve(homedir(), "Library/Messages/chat.db");

/**
 * Options for message hook configuration
 */
interface UseMessagesOptions {
  searchText?: string; // Optional text to filter messages
  searchType: SearchType; // Type of search (all or code-only)
  enabled?: boolean; // Whether iMessage source is enabled
}

/**
 * Generates the base SQL query for fetching messages
 * Applies time-based filtering based on user preferences
 */
function getBaseQuery() {
  const preferences = getPreferenceValues<Preferences>();
  const lookBackUnit = preferences.lookBackUnit;
  const lookBackAmount = parseInt(preferences?.lookBackAmount || "1");
  const lookBackMinutes = calculateLookBackMinutes(lookBackUnit, lookBackAmount);
  let baseQuery = `
    select
      message.guid,
      message.rowid,
      ifnull(handle.uncanonicalized_id, chat.chat_identifier) AS sender,
      message.service,
      datetime(message.date / 1000000000 + 978307200, 'unixepoch', 'localtime') AS message_date,
      message.text
    from message
      left join chat_message_join on chat_message_join.message_id = message.ROWID
      left join chat on chat.ROWID = chat_message_join.chat_id
      left join handle on message.handle_id = handle.ROWID
    where message.is_from_me = 0
      and message.text is not null
      and length(message.text) > 0
      and datetime(message.date / 1000000000 + strftime('%s', '2001-01-01'), 'unixepoch', 'localtime') >= datetime('now', '-${lookBackMinutes} minutes', 'localtime')
	`;
  if (preferences.ignoreRead) baseQuery += " and message.is_read = 0";
  return baseQuery;
}

/**
 * Builds the complete SQL query with search and filtering options
 * @param options Search and filtering parameters
 */
function getQuery(options: { searchText?: string; searchType: SearchType }) {
  let baseQuery = getBaseQuery();

  if (options.searchType === "code") {
    baseQuery = `${baseQuery} \nand (
      -- Matches 3 alphanumeric (e.g., 'ABC')
      message.text glob '*[0-9A-Z][0-9A-Z][0-9A-Z]*'
      -- Matches 4 alphanumeric (e.g., 'ABCD')
      or message.text glob '*[0-9A-Z][0-9A-Z][0-9A-Z][0-9A-Z]*'
      -- Matches 5 alphanumeric (e.g., 'ABCDE')
      or message.text glob '*[0-9A-Z][0-9A-Z][0-9A-Z][0-9A-Z][0-9A-Z]*'
      -- Matches 6 alphanumeric (e.g., 'ABCDEF')
      or message.text glob '*[0-9A-Z][0-9A-Z][0-9A-Z][0-9A-Z][0-9A-Z][0-9A-Z]*'
      -- Matches format '123-456'
      or message.text glob '*[0-9][0-9][0-9]-[0-9][0-9][0-9]*'
      -- Matches 7 alphanumeric (e.g., 'ABCDEFG')
      or message.text glob '*[0-9A-Z][0-9A-Z][0-9A-Z][0-9A-Z][0-9A-Z][0-9A-Z][0-9A-Z]*'
      -- Matches 8 alphanumeric (e.g., 'ABCDEFGH')
      or message.text glob '*[0-9A-Z][0-9A-Z][0-9A-Z][0-9A-Z][0-9A-Z][0-9A-Z][0-9A-Z][0-9A-Z]*'
    )`;
  }

  if (options.searchText !== "") {
    baseQuery = `${baseQuery} \nand message.text like '%${options.searchText}%'`;
  }

  return `${baseQuery} \norder by message.date desc limit 100`.trim();
}

/**
 * React hook for managing iMessage data and 2FA code detection
 * Provides real-time message monitoring using SQLite database
 */
export function useMessages(options: UseMessagesOptions) {
  const query = getQuery(options);
  const enabled = options.enabled ?? true;

  if (!enabled) {
    return {
      data: [],
      permissionView: null,
      revalidate: async () => Promise.resolve(),
    };
  }

  return useSQL<Message>(DB_PATH, query);
}
