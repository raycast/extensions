import { homedir } from "os";
import { resolve } from "path";
import { useSQL } from "@raycast/utils";
import { Message, Preferences, SearchType } from "./types";
import { getPreferenceValues } from "@raycast/api";

const DB_PATH = resolve(homedir(), "Library/Messages/chat.db");

function getBaseQuery() {
  const preferences = getPreferenceValues<Preferences>();
  const lookBackDays = parseInt(preferences?.lookBackDays || "1") || 1;
  const lookBackMinutes = lookBackDays * 24 * 60;
  return `
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
}

function getQuery(options: { searchText?: string; searchType: SearchType }) {
  let baseQuery = getBaseQuery();

  if (options.searchType === "code") {
    baseQuery = `${baseQuery} \nand (
      message.text glob '*[0-9][0-9][0-9]*'
      or message.text glob '*[0-9][0-9][0-9][0-9]*'
      or message.text glob '*[0-9][0-9][0-9][0-9][0-9]*'
      or message.text glob '*[0-9][0-9][0-9][0-9][0-9][0-9]*'
      or message.text glob '*[0-9][0-9][0-9]-[0-9][0-9][0-9]*'
      or message.text glob '*[0-9][0-9][0-9][0-9][0-9][0-9][0-9]*'
      or message.text glob '*[0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9]*'
    )`;
  }

  if (options.searchText !== "") {
    baseQuery = `${baseQuery} \nand message.text like '%${options.searchText}%'`;
  }

  return `${baseQuery} \norder by message.date desc limit 100`.trim();
}

export function useMessages(options: { searchText?: string; searchType: SearchType }) {
  const query = getQuery(options);
  // console.log(query.substring(200));
  return useSQL<Message>(DB_PATH, query);
}
