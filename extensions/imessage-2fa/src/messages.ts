/**
 * iMessage handling module for 2FA code detection
 * Provides functionality to fetch and process 2FA codes from iMessage database
 */

import { homedir } from "os";
import { resolve } from "path";
import { useMemo } from "react";
import { useSQL } from "@raycast/utils";
import { Message, Preferences, SearchType } from "./types";
import { getPreferenceValues } from "@raycast/api";
import { calculateLookBackMinutes, combineMessageText, decodeAttributedBody } from "./utils";

// Path to the iMessage database
const DB_PATH = resolve(homedir(), "Library/Messages/chat.db");

// Same candidate check the code search used to run in SQL: at least 3 consecutive digits/capitals
const CODE_CANDIDATE_REGEX = /[0-9A-Z]{3}/;

/**
 * Options for message hook configuration
 */
interface UseMessagesOptions {
  searchText?: string; // Optional text to filter messages
  searchType: SearchType; // Type of search (all or code-only)
  enabled?: boolean; // Whether iMessage source is enabled
}

/**
 * Raw row returned by the SQL query
 * `attributed_body` is hex encoded: the blob contains NUL bytes, and casting it to text
 * truncates it at the first one, before the message body
 */
interface MessageRow {
  guid: string;
  sender: string;
  message_date: string;
  text: string | null;
  attributed_body: string | null;
}

/**
 * Generates the SQL query for fetching messages
 * Applies time-based filtering based on user preferences. Text filtering happens after
 * decoding, since on recent macOS versions most messages only have a body in `attributedBody`
 */
function getQuery() {
  const preferences = getPreferenceValues<Preferences>();
  const lookBackUnit = preferences.lookBackUnit;
  const lookBackAmount = parseInt(preferences?.lookBackAmount || "1");
  const lookBackMinutes = calculateLookBackMinutes(lookBackUnit, lookBackAmount);

  let query = `
    select
      message.guid,
      message.rowid,
      ifnull(handle.uncanonicalized_id, chat.chat_identifier) AS sender,
      message.service,
      datetime(message.date / 1000000000 + 978307200, 'unixepoch', 'localtime') AS message_date,
      message.text,
      hex(message.attributedBody) AS attributed_body,
      message.is_read
    from message
      left join chat_message_join on chat_message_join.message_id = message.ROWID
      left join chat on chat.ROWID = chat_message_join.chat_id
      left join handle on message.handle_id = handle.ROWID
    where message.is_from_me = 0
      and (message.text is not null or message.attributedBody is not null)
      and datetime(message.date / 1000000000 + strftime('%s', '2001-01-01'), 'unixepoch', 'localtime') >= datetime('now', '-${lookBackMinutes} minutes', 'localtime')
	`;
  if (preferences.ignoreRead) query += " and message.is_read = 0";

  return `${query} \norder by message.date desc limit 100`.trim();
}

/**
 * Converts a raw row into a message, decoding the rich text body
 */
function toMessage({ attributed_body, ...row }: MessageRow): Message {
  const text = combineMessageText(row.text, decodeAttributedBody(attributed_body));
  return { ...row, text, displayText: text };
}

/**
 * React hook for managing iMessage data and 2FA code detection
 * Provides real-time message monitoring using SQLite database
 */
export function useMessages(options: UseMessagesOptions) {
  const enabled = options.enabled ?? true;

  if (!enabled) {
    return {
      data: [],
      permissionView: null,
      revalidate: async () => Promise.resolve(),
    };
  }

  const result = useSQL<MessageRow>(DB_PATH, getQuery());

  const data = useMemo(() => {
    const searchText = options.searchText?.toLowerCase();
    return result.data
      ?.map(toMessage)
      .filter((message) => message.text.length > 0)
      .filter((message) => options.searchType !== "code" || CODE_CANDIDATE_REGEX.test(message.text))
      .filter((message) => !searchText || message.text.toLowerCase().includes(searchText));
  }, [result.data, options.searchText, options.searchType]);

  return { ...result, data };
}
